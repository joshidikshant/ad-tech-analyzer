// test-cdp-automated.ts
import { chromium } from "playwright";
import { execSync, spawnSync } from "node:child_process";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

const URL =
  "https://www.bollywoodshaadis.com/articles/sherrone-moore-intimately-involved-with-michigan-staffer-72574";
const CDP_HTTP = "http://127.0.0.1:9222";
const MODE = process.argv.includes("--collector") ? "collector" : "main";

type Results = {
  prebidConfigKeys: string[];
  gamTargetingKeys: string[];
  consoleCount: number;
  gamEventsCount: number;
  gamEventsSample: Array<{ type: string; t: number; payloadKeys: string[] }>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function killChromeOn9222BestEffort() {
  try {
    execSync(
      `lsof -ti tcp:9222 | xargs -r kill -9 || true`,
      { stdio: "ignore", shell: "/bin/zsh" }
    );
  } catch {
    // ignore (lsof may not exist, or nothing is listening)
  }
}

async function collectorMain(): Promise<number> {
  const browser = await chromium.connectOverCDP(CDP_HTTP);
  const contexts = browser.contexts();
  const pages = contexts.flatMap((c) => c.pages());
  const page = pages.find((p) => p.url() && p.url() !== "about:blank") ?? pages[0];
  if (!page) {
    console.error("[collector] No page found in CDP browser.");
    await browser.close();
    return 2;
  }

  let consoleCount = 0;
  page.on("console", () => {
    consoleCount += 1;
  });

  await page.evaluate(() => {
    const w = window as any;
    if (w.__cdpTestBridge) return;

    w.__cdpTestBridge = {
      startedAt: Date.now(),
      gamEvents: [] as any[],
      gamListenerAttached: false,
    };

    const tryAttachGam = () => {
      try {
        const gt = w.googletag;
        if (!gt || !gt.pubads) return false;
        const pubads = gt.pubads();
        if (!pubads || typeof pubads.addEventListener !== "function") return false;

        if (w.__cdpTestBridge.gamListenerAttached) return true;
        const eventTypes = [
          "impressionViewable",
          "slotRequested",
          "slotResponseReceived",
          "slotRenderEnded",
          "slotOnload",
          "slotVisibilityChanged",
        ];

        for (const type of eventTypes) {
          pubads.addEventListener(type, (e: any) => {
            const payloadKeys = e && typeof e === "object" ? Object.keys(e) : [];
            w.__cdpTestBridge.gamEvents.push({ type, t: Date.now(), payloadKeys });
          });
        }
        w.__cdpTestBridge.gamListenerAttached = true;
        return true;
      } catch {
        return false;
      }
    };

    const interval = setInterval(() => {
      if (tryAttachGam()) clearInterval(interval);
    }, 250);

    setTimeout(() => clearInterval(interval), 15000);
  });

  await sleep(30_000);

  const inPage = await page.evaluate(() => {
    const w = window as any;

    const prebidConfigKeys = (() => {
      try {
        const pb = w.pbjs;
        const cfg = pb && typeof pb.getConfig === "function" ? pb.getConfig() : pb?.config;
        if (!cfg || typeof cfg !== "object") return [];
        return Object.keys(cfg).sort();
      } catch {
        return [];
      }
    })();

    const gamTargetingKeys = (() => {
      try {
        const gt = w.googletag;
        const pubads = gt && typeof gt.pubads === "function" ? gt.pubads() : null;
        if (!pubads || typeof pubads.getTargetingKeys !== "function") return [];
        const keys = pubads.getTargetingKeys();
        return Array.isArray(keys) ? keys.slice().sort() : [];
      } catch {
        return [];
      }
    })();

    const gamEvents = (() => {
      const ev = w.__cdpTestBridge?.gamEvents;
      return Array.isArray(ev) ? ev : [];
    })();

    return {
      prebidConfigKeys,
      gamTargetingKeys,
      gamEventsCount: gamEvents.length,
      gamEventsSample: gamEvents.slice(0, 10),
    };
  });

  const results: Results = {
    prebidConfigKeys: inPage.prebidConfigKeys || [],
    gamTargetingKeys: inPage.gamTargetingKeys || [],
    consoleCount,
    gamEventsCount: inPage.gamEventsCount || 0,
    gamEventsSample: inPage.gamEventsSample || [],
  };

  console.log(JSON.stringify({ ok: true, results }, null, 2));
  await browser.close();
  return 0;
}

async function main(): Promise<number> {
  killChromeOn9222BestEffort();

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-cdp-test-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      "--remote-debugging-port=9222",
      "--remote-debugging-address=127.0.0.1",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  await sleep(10_000);

  // Spawn a second Node process to guarantee a second Playwright instance.
  const child = spawnSync(
    "npx",
    ["tsx", "test-cdp-automated.ts", "--collector"],
    { stdio: "pipe", env: process.env, shell: true }
  );

  const stdout = child.stdout?.toString("utf8") ?? "";
  const stderr = child.stderr?.toString("utf8") ?? "";

  if (stderr.trim()) process.stderr.write(stderr);
  if (stdout.trim()) process.stdout.write(stdout);

  let extracted: Results | null = null;
  try {
    const parsed = JSON.parse(stdout.trim());
    extracted = parsed?.results ?? null;
  } catch {
    // ignore
  }

  if (extracted) {
    const verdict =
      extracted.consoleCount > 0 ||
      extracted.gamEventsCount > 0 ||
      extracted.prebidConfigKeys.length > 0 ||
      extracted.gamTargetingKeys.length > 0;

    console.log("\n=== Summary ===");
    console.log(`Prebid config keys: ${extracted.prebidConfigKeys.length}`);
    console.log(`GAM targeting keys: ${extracted.gamTargetingKeys.length}`);
    console.log(`Console count: ${extracted.consoleCount}`);
    console.log(`GAM events count: ${extracted.gamEventsCount}`);
    console.log(
      `Verdict: ${verdict ? "YES" : "NO"} — CDP-connected Playwright captured runtime data`
    );
  } else {
    console.log(
      "\nVerdict: NO — collector did not return parseable results (check stderr above)"
    );
  }

  await context.close();
  return child.status ?? 1;
}

(async () => {
  const code = MODE === "collector" ? await collectorMain() : await main();
  process.exit(code);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
