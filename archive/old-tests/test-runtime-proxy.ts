/**
 * Runtime Proxy Pattern ad-tech detection (universal, execution-layer).
 *
 * Usage:
 *   npx tsx test-runtime-proxy.ts https://example.com
 *
 * Notes:
 * - Injects BEFORE any page scripts via page.addInitScript().
 * - Proxies window.pbjs and window.googletag (incl. googletag.cmd.push).
 * - Stores all captured calls in window.__adTechSnapshot.
 * - Scrolls 500px every 2s and observes for 180s by default.
 */

import { chromium, type Browser, type Page } from "playwright";

type Snapshot = {
  meta: {
    startedAt: number;
    url?: string;
    userAgent?: string;
  };
  pbjs: {
    assignedAt?: number;
    calls: Array<{ t: number; method: string; args: unknown[] }>;
  };
  googletag: {
    assignedAt?: number;
    calls: Array<{ t: number; method: string; args: unknown[] }>;
    cmd: Array<{ t: number; kind: "push"; detail: unknown }>;
  };
  errors: Array<{ t: number; where: string; message: string }>;
};

const OBSERVATION_MS = 180_000;
const SCROLL_EVERY_MS = 2_000;
const SCROLL_STEP_PX = 500;

function getTargetUrl(): string {
  const url = process.argv[2];
  if (!url) {
    console.error("Missing URL.\nUsage: test-runtime-proxy.ts https://example.com");
    process.exit(2);
  }
  return url;
}

function initScript() {
  // NOTE: This function is serialized and executed in the page context.
  return () => {
    const now = () => Date.now();

    const safeClone = (value: any) => {
      try {
        // @ts-ignore
        if (typeof structuredClone === "function") return structuredClone(value);
      } catch {}
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    };

    const ensureSnapshot = () => {
      const w = window as any;
      if (!w.__adTechSnapshot) {
        w.__adTechSnapshot = {
          meta: { startedAt: now() },
          pbjs: { calls: [] },
          googletag: { calls: [], cmd: [] },
          errors: [],
        };
      }
      return w.__adTechSnapshot as any;
    };

    const recordError = (where: string, err: any) => {
      const snap = ensureSnapshot();
      snap.errors.push({
        t: now(),
        where,
        message: err?.message ? String(err.message) : String(err),
      });
    };

    const makeCallProxy = (label: "pbjs" | "googletag", target: any) => {
      const snap = ensureSnapshot();
      const callsArr = snap[label].calls as any[];

      const wrapFunction = (methodPath: string, fn: Function) => {
        const wrapped = function (this: any, ...args: any[]) {
          try {
            callsArr.push({ t: now(), method: methodPath, args: safeClone(args) });
          } catch (e) {
            recordError(`${label}.record(${methodPath})`, e);
          }
          return fn.apply(this, args);
        };
        try {
          Object.defineProperty(wrapped, "name", { value: `__adtech_${label}_${methodPath}` });
        } catch {}
        return wrapped;
      };

      const proxy = new Proxy(target, {
        get(obj, prop, receiver) {
          try {
            const value = Reflect.get(obj, prop, receiver);
            if (typeof prop === "symbol") return value;
            const propName = String(prop);

            if (propName === "__isAdTechProxy") return true;
            if (propName === "constructor") return value;

            if (typeof value === "function") {
              return wrapFunction(propName, value);
            }
            return value;
          } catch (e) {
            recordError(`${label}.get`, e);
            return undefined;
          }
        },
        set(obj, prop, value, receiver) {
          try {
            return Reflect.set(obj, prop, value, receiver);
          } catch (e) {
            recordError(`${label}.set`, e);
            return false;
          }
        },
        apply(obj, thisArg, args) {
          try {
            callsArr.push({ t: now(), method: "(call)", args: safeClone(args) });
          } catch (e) {
            recordError(`${label}.apply.record`, e);
          }
          // @ts-ignore
          return Reflect.apply(obj, thisArg, args);
        },
      });

      try {
        Object.defineProperty(proxy, "__isAdTechProxy", { value: true });
      } catch {}
      return proxy;
    };

    const proxyGoogletagCmdPush = (gt: any) => {
      const snap = ensureSnapshot();
      const cmdArr = (snap.googletag.cmd ??= []) as any[];

      const ensureCmd = () => {
        if (!gt) return;
        if (!gt.cmd) gt.cmd = [];
        const cmd = gt.cmd;

        if (cmd && typeof cmd.push === "function" && !(cmd as any).__adtech_patched) {
          const originalPush = cmd.push.bind(cmd);
          const patched = (...items: any[]) => {
            for (const item of items) {
              try {
                cmdArr.push({ t: now(), kind: "push", detail: safeClone(item) });
              } catch (e) {
                recordError("googletag.cmd.push.record", e);
              }
            }
            return originalPush(...items);
          };
          try {
            (patched as any).__adtech_patched = true;
            Object.defineProperty(cmd, "push", { value: patched, configurable: true, writable: true });
            (cmd as any).__adtech_patched = true;
          } catch (e) {
            recordError("googletag.cmd.push.patch", e);
          }
        }
      };

      try {
        ensureCmd();
      } catch (e) {
        recordError("googletag.cmd.ensureCmd", e);
      }

      try {
        let internalCmd = gt.cmd;
        Object.defineProperty(gt, "cmd", {
          configurable: true,
          enumerable: true,
          get() {
            return internalCmd;
          },
          set(v) {
            internalCmd = v;
            try {
              ensureCmd();
            } catch (e) {
              recordError("googletag.cmd.setter.ensureCmd", e);
            }
          },
        });
      } catch (e) {
        recordError("googletag.cmd.defineProperty", e);
      }
    };

    const defineRuntimeProxy = (propName: "pbjs" | "googletag", wrap: (value: any) => any) => {
      const w = window as any;
      const snap = ensureSnapshot();

      let internalValue = w[propName];
      const applyWrap = (value: any) => {
        if (!value) return value;
        if ((value as any).__isAdTechProxy) return value;
        const wrapped = wrap(value);
        if (propName === "pbjs") snap.pbjs.assignedAt = now();
        if (propName === "googletag") snap.googletag.assignedAt = now();
        return wrapped;
      };

      internalValue = applyWrap(internalValue);

      try {
        Object.defineProperty(w, propName, {
          configurable: true,
          enumerable: true,
          get() {
            return internalValue;
          },
          set(v) {
            internalValue = applyWrap(v);
          },
        });
      } catch (e) {
        recordError(`${propName}.defineProperty`, e);
      }
    };

    defineRuntimeProxy("pbjs", (pbjs: any) => makeCallProxy("pbjs", pbjs));

    defineRuntimeProxy("googletag", (gt: any) => {
      const proxied = makeCallProxy("googletag", gt);
      try {
        proxyGoogletagCmdPush(proxied);
      } catch (e) {
        recordError("googletag.cmd.setup", e);
      }
      return proxied;
    });

    try {
      window.addEventListener("error", (event) =>
        recordError("window.error", (event as any).error ?? event)
      );
      window.addEventListener("unhandledrejection", (event) =>
        recordError("window.unhandledrejection", (event as any).reason ?? event)
      );
    } catch {}
  };
}

async function simulateScroll(page: Page, durationMs: number) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await page.evaluate((step) => {
      try {
        window.scrollBy(0, step);
      } catch {}
    }, SCROLL_STEP_PX);
    await page.waitForTimeout(SCROLL_EVERY_MS);
  }
}

async function main() {
  const url = getTargetUrl();
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(initScript());

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    await page.evaluate(() => {
      const w = window as any;
      w.__adTechSnapshot = w.__adTechSnapshot || {};
      w.__adTechSnapshot.meta = w.__adTechSnapshot.meta || {};
      w.__adTechSnapshot.meta.url = location.href;
      w.__adTechSnapshot.meta.userAgent = navigator.userAgent;
    });

    await Promise.race([simulateScroll(page, OBSERVATION_MS), page.waitForTimeout(OBSERVATION_MS)]);

    const snapshot = (await page.evaluate(() => (window as any).__adTechSnapshot)) as Snapshot;
    console.log(JSON.stringify(snapshot, null, 2));
  } finally {
    await browser?.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
