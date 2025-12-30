import { chromium, type Page } from 'playwright';
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

type AdTechSnapshot = {
  prebid: any;
  gam: { targeting: Record<string, unknown[]>; slots: unknown[] } | null;
  timestamp: number | null;
  error: string | null;
};

type ConsoleMessage = { level: string; text: string; timestamp: number; url?: string; args?: string[] };

type GamEvent = { type: string; timestamp: number; slot?: string; serviceName?: string };

const AD_KEYWORDS = ['prebid', 'googletag', 'gpt', 'consent', 'cmp', 'ezoic', 'freestar'];
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const UUID_REGEX =
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;

function stripPii(s: string) {
  return s.replace(EMAIL_REGEX, '[REDACTED_EMAIL]').replace(UUID_REGEX, '[REDACTED_UUID]');
}
function matchesAdKeyword(text: string) {
  const lower = text.toLowerCase();
  return AD_KEYWORDS.some((k) => lower.includes(k));
}

async function waitForEnter(prompt: string) {
  const rl = readline.createInterface({ input, output });
  await new Promise<void>((resolve) => rl.question(prompt, () => resolve()));
  rl.close();
}

async function injectBridgeNow(page: Page) {
  // Inline from src/collector/bridge.ts (adapted to run immediately via evaluate)
  await page.evaluate(() => {
    const snapshot: AdTechSnapshot = { prebid: null, gam: null, timestamp: null, error: null };
    (window as any).__adTechSnapshot = snapshot;

    const startPolling = () => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs && typeof pbjs.getConfig === 'function') {
            const config = pbjs.getConfig();
            if (config) snapshot.prebid = config;
          }
        } catch (err) {
          snapshot.error = `prebid:${(err as Error).message}`;
        }

        try {
          const gtag = (window as any).googletag;
          if (gtag && typeof gtag.pubads === 'function') {
            const pubads = gtag.pubads();
            if (pubads) {
              const targeting: Record<string, unknown[]> = {};
              try {
                const keys = pubads.getTargetingKeys?.() || [];
                keys.forEach((key: string) => {
                  targeting[key] = pubads.getTargeting?.(key);
                });
              } catch (err) {
                snapshot.error = snapshot.error ?? `gam-targeting:${(err as Error).message}`;
              }
              const slots = pubads.getSlots?.() || [];
              snapshot.gam = { targeting, slots };
            }
          }
        } catch (err) {
          snapshot.error = snapshot.error ?? `gam:${(err as Error).message}`;
        }

        snapshot.timestamp = Date.now();
        if (Date.now() - startedAt >= 20_000) clearInterval(interval);
      }, 100);
    };

    setTimeout(startPolling, 5000);
  });
}

async function captureConsoleMessages(page: Page): Promise<ConsoleMessage[]> {
  // Inline from src/collector/console-capture.ts
  const collected: ConsoleMessage[] = [];
  try {
    const client = await page.context().newCDPSession(page);
    await client.send('Runtime.enable');
    client.on('Runtime.consoleAPICalled', (event: any) => {
      try {
        const args = (event.args || []).map((arg: any) =>
          stripPii(String(arg.value ?? arg.description ?? ''))
        );
        const text = stripPii(args.join(' '));
        if (!matchesAdKeyword(text)) return;
        const url = event.stackTrace?.callFrames?.[0]?.url;
        collected.push({ level: event.type, text, timestamp: event.timestamp || Date.now(), url, args });
      } catch (err) {
        console.warn('[ConsoleCapture] Failed to process message:', err);
      }
    });
  } catch (err) {
    console.warn('[ConsoleCapture] Failed to setup CDP session:', err);
    return [];
  }
  return collected;
}

async function captureGamEvents(page: Page): Promise<GamEvent[]> {
  // Inline from src/collector/gam-events.ts
  const events = await page.evaluate(() => {
    const gt = (window as any).googletag;
    const pubads = gt?.pubads?.();
    const getEventLog = pubads?.getEventLog?.();
    if (!getEventLog?.getAllEvents) return [];
    const raw = getEventLog.getAllEvents?.() ?? [];
    return raw.map((e: any) => ({
      type: e.eventType || e.type,
      timestamp: Number(e.timestamp) || 0,
      slot: e.slotName || e.slot?.getSlotElementId?.() || e.slot?.getAdUnitPath?.(),
      serviceName: e.serviceName || e.service?.getName?.(),
    }));
  });
  return Array.isArray(events) ? events : [];
}

function detectRaceConditions(events: GamEvent[]): string[] {
  // Inline from src/collector/gam-events.ts
  const warnings: string[] = [];
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const firstRefresh = sorted.find((e) => e.type === 'refresh');
  const firstSlotRequest = sorted.find((e) => e.type === 'slotRequested');
  if (firstRefresh && firstSlotRequest && firstSlotRequest.timestamp < firstRefresh.timestamp) {
    warnings.push(
      'Fetch Before Refresh: slot requested before refresh() called. This can cause ads to render without latest targeting or bid data.'
    );
  }
  const firstSlotRequestedBySlot = new Map<string | undefined, GamEvent>();
  for (const e of sorted) {
    if (e.type === 'slotRequested' && !firstSlotRequestedBySlot.has(e.slot)) firstSlotRequestedBySlot.set(e.slot, e);
    if (e.type === 'setTargeting') {
      const req = firstSlotRequestedBySlot.get(e.slot) ?? firstSlotRequest;
      if (req && e.timestamp > req.timestamp) {
        warnings.push(
          `Targeting After Request: targeting set after ad request for slot ${e.slot ?? 'unknown'}. Targeting data will not be included in this ad request.`
        );
        break;
      }
    }
  }
  return warnings;
}

async function main() {
  console.log(
    "Launch Chrome with: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222"
  );
  console.log('Navigate to https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/');
  await waitForEnter('Press Enter when ready...');

  const urlNeedle = 'geeksforgeeks.org/dsa/dsa-tutorial';
  const browser = await chromium.connectOverCDP('http://localhost:9222');

  const allPages = browser.contexts().flatMap((c) => c.pages());
  const page = allPages.find((p) => (p.url() || '').includes(urlNeedle));
  if (!page) {
    console.error(`Could not find a tab matching: ${urlNeedle}`);
    console.error('Open the article in a Chrome tab (same Chrome instance), then retry.');
    await browser.close();
    process.exit(1);
  }

  const consoleMessages = await captureConsoleMessages(page);
  await injectBridgeNow(page);

  console.log('Collecting for 30s...');
  await page.waitForTimeout(30_000);

  const snapshot: AdTechSnapshot | null = await page.evaluate(() => (window as any).__adTechSnapshot ?? null);
  const gamEvents = await captureGamEvents(page);
  const raceWarnings = detectRaceConditions(gamEvents);

  const prebid = snapshot?.prebid ?? null;
  const prebidKeys = prebid && typeof prebid === 'object' ? Object.keys(prebid) : [];
  const prebidTimeout =
    prebid?.bidderTimeout ?? prebid?.timeout ?? prebid?.auctionOptions?.timeout ?? prebid?.userSync?.syncDelay;

  const targeting = snapshot?.gam?.targeting ?? null;
  const targetingKeys = targeting ? Object.keys(targeting) : [];

  console.log('\n=== Results ===');
  console.log(`Prebid config captured? ${Boolean(prebid)} | keys=${prebidKeys.length} | timeout=${prebidTimeout ?? 'n/a'}`);
  console.log(`GAM targeting captured? ${Boolean(targeting)} | keys=${targetingKeys.length}`);
  console.log(`Console messages captured? count=${consoleMessages.length}`);
  console.log(`GAM events captured? count=${gamEvents.length}`);
  console.log(`Race conditions detected? ${raceWarnings.length ? 'YES' : 'no'}`);
  for (const w of raceWarnings) console.log(`- ${w}`);

  const verdict =
    Boolean(prebid) || Boolean(targeting) || consoleMessages.length > 0 || gamEvents.length > 0
      ? 'YES: CDP attached to a real manual Chrome tab captured runtime signals.'
      : "NO: Didn't capture meaningful runtime signals (check tab match, consent banners, or CDP port).";

  console.log('\n=== Verdict ===');
  console.log(verdict);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
