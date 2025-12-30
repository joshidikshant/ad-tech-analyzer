import { chromium } from 'playwright';
import fs from 'node:fs';
import { injectBridge, extractBridgeData } from './src/collector/bridge-enhanced';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tsSafe = () => new Date().toISOString().replace(/[:.]/g, '-');

function domainFrom(urlStr: string) {
  const u = new URL(urlStr);
  return u.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('USAGE: npx tsx observe-site-5min.ts <URL>');
    process.exit(1);
  }

  const domain = domainFrom(url);
  const outFile = `observe-${domain}-${tsSafe()}.json`;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await injectBridge(page);

  const startedAt = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const observationMs = 5 * 60 * 1000;
  const tickMs = 30 * 1000;
  const progress: any[] = [];

  const readCounts = async () => {
    const snap = await extractBridgeData(page);
    const hooks = snap?.hooks ?? {};
    const gam = snap?.gam ?? null;
    const prebid = snap?.prebid ?? null;
    return {
      t: Date.now(),
      hooks: {
        gptCmdHooked: !!hooks.gptCmdHooked,
        gptEventsHooked: !!hooks.gptEventsHooked,
        prebidHooked: !!hooks.prebidHooked,
      },
      gam: {
        slotsDefined: gam?.slotsDefined?.length ?? 0,
        eventsCaptured: gam?.events?.length ?? 0,
        refreshCyclesDetected: gam?.refresh?.totalRefreshes ?? 0,
        raceConditionsFound: gam?.race?.findings?.length ?? 0,
      },
      prebid: { eventsCaptured: prebid?.events?.length ?? 0 },
      error: snap?.error ?? null,
    };
  };

  const obsStart = Date.now();
  let nextTickAt = obsStart;

  while (true) {
    const now = Date.now();
    const elapsed = now - obsStart;
    if (elapsed >= observationMs) break;

    if (now >= nextTickAt) {
      const s = await readCounts();
      progress.push(s);
      const e = Math.min(observationMs, s.t - obsStart);
      console.log(
        `[${Math.round(e / 1000)}s/300s] hooks(gptCmd=${s.hooks.gptCmdHooked}, gptEvents=${s.hooks.gptEventsHooked}, prebid=${s.hooks.prebidHooked}) ` +
          `GAM(slots=${s.gam.slotsDefined}, events=${s.gam.eventsCaptured}, refresh=${s.gam.refreshCyclesDetected}, race=${s.gam.raceConditionsFound}) ` +
          `PB(events=${s.prebid.eventsCaptured})${s.error ? ` err=${s.error}` : ''}`
      );
      nextTickAt += tickMs;
    }

    await sleep(Math.min(250, observationMs - elapsed));
  }

  const finalSnapshot = await extractBridgeData(page);
  const endedAt = Date.now();

  const report = {
    url,
    domain,
    startedAt,
    navigatedAt: obsStart,
    endedAt,
    observationMs,
    progressEveryMs: tickMs,
    progress,
    finalSnapshot,
  };

  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Saved report: ${outFile}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
