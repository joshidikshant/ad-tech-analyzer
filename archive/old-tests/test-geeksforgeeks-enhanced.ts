import { chromium } from 'playwright';
import fs from 'node:fs/promises';

import { injectBridge, extractBridgeData } from './src/collector/bridge.js';
import { captureConsoleMessages } from './src/collector/console-capture.js';
import {
  captureGamEvents,
  correlateAuctions,
  detectRaceConditions,
  type CorrelatedAuction,
} from './src/collector/gam-events.js';
import { analyzeNetworkStack } from './src/analyzer/network-analyzer.js';

const URL = 'https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/';
const OUT_FILE = 'geeksforgeeks-enhanced-result.json';

function fmtMs(ms: number | null | undefined) {
  return ms == null ? 'n/a' : `${Math.round(ms)}ms`;
}

function topByCpm<T extends { cpm?: number; bidderCode?: string; adUnitCode?: string }>(bids: T[], n = 5) {
  return [...(bids || [])]
    .filter((b) => typeof b?.cpm === 'number')
    .sort((a, b) => (b.cpm ?? -1) - (a.cpm ?? -1))
    .slice(0, n);
}

function uniq<T>(xs: T[]) {
  return [...new Set(xs)];
}

function printAuctionTimelines(correlated: CorrelatedAuction[], limit = 10) {
  const show = correlated.slice(0, limit);
  if (!show.length) return;

  console.log('\nAuction timelines (Prebid → GAM):');
  for (const a of show) {
    const winner = a.prebid.winningBid;
    const winnerStr = winner?.bidderCode
      ? `${winner.bidderCode}${typeof winner.cpm === 'number' ? ` @ ${winner.cpm.toFixed(2)}` : ''}`
      : 'n/a';

    console.log(
      `- auctionId=${a.auctionId} slot=${a.gam.slot ?? 'n/a'} ` +
        `pbDur=${fmtMs(a.prebid.auctionDurationMs)} ` +
        `gamLatency=${fmtMs(a.metrics.gamLatencyMs)} total=${fmtMs(a.metrics.totalTimeMs)} ` +
        `winner=${winnerStr}`
    );
  }
  if (correlated.length > limit) console.log(`  ... and ${correlated.length - limit} more`);
}

async function main() {
  console.log('ENHANCED TEST: GeeksForGeeks with full Phase 1 auction capture\n');
  console.log(`URL: ${URL}\n`);

  console.log('[1/5] Network vendor detection...');
  const network = await analyzeNetworkStack(URL, { device: 'desktop', debug: false });
  const vendors = network.vendors || [];
  console.log(`- Vendors detected (network): ${vendors.length}`);

  console.log('[2/5] Launching Playwright (stealth-ish: disable automation flags)...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    (window as any).chrome = (window as any).chrome || { runtime: {} };

    const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
    (window.navigator.permissions as any).query = (parameters: any) =>
      parameters?.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);

    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  const page = await context.newPage();

  console.log('[3/5] Setting up collectors (console, bridge, GAM)...');
  const consoleMessages = await captureConsoleMessages(page);
  await injectBridge(page);

  console.log('[4/5] Navigating...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  console.log('[5/5] Waiting 30s for data collection (5s delay + 20s polling + 5s buffer)...');
  await page.waitForTimeout(30_000);

  const bridge = await extractBridgeData(page);
  const gamEvents = await captureGamEvents(page);

  const prebidExtracted = bridge?.prebid?.extracted ?? null;
  const allBids = prebidExtracted?.bids ?? [];
  const winningBids = prebidExtracted?.winningBids ?? [];

  const correlated = correlateAuctions(prebidExtracted, gamEvents, bridge?.gam?.targeting);
  const raceWarnings = detectRaceConditions(gamEvents);

  console.log('\n=== Results ===');

  console.log('\nVendors detected (network):');
  if (!vendors.length) console.log('- none');
  else {
    const byCategory = vendors.reduce((acc: Record<string, string[]>, v: any) => {
      const cat = v.category || 'unknown';
      (acc[cat] ||= []).push(v.name);
      return acc;
    }, {});
    for (const [cat, names] of Object.entries(byCategory)) {
      console.log(`- ${cat}: ${uniq(names).join(', ')}`);
    }
  }

  console.log(`\nAuction count: ${Object.keys(prebidExtracted?.auctions ?? {}).length} (prebid), ${correlated.length} (correlated)`);

  console.log('\nBid CPMs (top 5):');
  const topBids = topByCpm(allBids, 5);
  if (!topBids.length) console.log('- none');
  else {
    topBids.forEach((b, i) =>
      console.log(
        `- #${i + 1} ${b.bidderCode ?? 'unknown'} @ ${(b.cpm ?? 0).toFixed(2)} ` +
          `adUnit=${b.adUnitCode ?? 'n/a'} auctionId=${(b as any).auctionId ?? 'n/a'}`
      )
    );
  }

  console.log('\nWinning bidders:');
  const topWinners = topByCpm(winningBids, 10);
  if (!topWinners.length) console.log('- none');
  else {
    topWinners.slice(0, 10).forEach((b, i) =>
      console.log(
        `- #${i + 1} ${b.bidderCode ?? 'unknown'} @ ${(b.cpm ?? 0).toFixed(2)} auctionId=${(b as any).auctionId ?? 'n/a'}`
      )
    );
  }

  printAuctionTimelines(correlated, 10);

  console.log('\nRace conditions detected:');
  if (!raceWarnings.length) console.log('- none');
  else raceWarnings.forEach((w) => console.log(`- ${w}`));

  console.log(`\nConsole messages captured: ${consoleMessages.length}`);
  console.log(`GAM events captured: ${gamEvents.length}`);
  console.log(`Bridge snapshot captured: ${bridge ? 'yes' : 'no'}${bridge?.error ? ` (error=${bridge.error})` : ''}`);

  const result = {
    url: URL,
    collectedAt: new Date().toISOString(),
    network: {
      loadTimeMs: network.loadTime,
      totalRequests: network.requests?.length ?? 0,
      vendors: network.vendors ?? [],
    },
    bridge,
    gamEvents,
    consoleMessages,
    correlatedAuctions: correlated,
    raceWarnings,
    summary: {
      vendorCount: vendors.length,
      prebidAuctionCount: Object.keys(prebidExtracted?.auctions ?? {}).length,
      correlatedAuctionCount: correlated.length,
      bidCount: allBids.length,
      winningBidCount: winningBids.length,
    },
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nSaved full results to ${OUT_FILE}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
