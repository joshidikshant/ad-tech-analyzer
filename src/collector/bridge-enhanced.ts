import { Page } from 'playwright';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };
type UnknownRecord = Record<string, unknown>;

export type GamEventName = 'slotRequested' | 'slotRenderEnded' | 'impressionViewable';
export type PrebidEventName = 'auctionInit' | 'auctionEnd' | 'bidWon' | 'bidResponse';

export interface BridgeTimingEvent {
  t: number;
  name: string;
  data?: UnknownRecord;
}

export interface GamSlotSummary {
  slotId?: string;
  adUnitPath?: string;
  sizes?: Array<[number, number]>;
  elementId?: string;
}

export interface GamEventRecord {
  t: number;
  name: GamEventName;
  slot?: GamSlotSummary;
  isEmpty?: boolean;
  creativeId?: string | number;
  lineItemId?: string | number;
  advertiserId?: string | number;
  campaignId?: string | number;
  size?: unknown;
  raw?: UnknownRecord;
}

export interface PrebidEventRecord {
  t: number;
  name: PrebidEventName;
  auctionId?: string;
  adUnitCode?: string;
  bidder?: string;
  cpm?: number;
  currency?: string;
  status?: string;
  timeToRespond?: number;
  raw?: UnknownRecord;
}

export interface GamEventLogSnapshot {
  t: number;
  ok: boolean;
  length?: number;
  delta?: number;
  sampleTypes?: string[];
  rawSample?: unknown[];
}

export interface RaceConditionFinding {
  t: number;
  type:
    | 'renderBeforeRequest'
    | 'impressionBeforeRender'
    | 'duplicateRequest'
    | 'missingRequest'
    | 'unknown';
  slotKey?: string;
  detail?: string;
}

export interface RefreshCycleSummary {
  t: number;
  slotKey: string;
  requestCount: number;
}

export interface AdTechSnapshotEnhanced {
  version: 'bridge-enhanced@1';
  timestamp: number | null;
  error: string | null;

  hooks: {
    installedAt: number;
    gptCmdHooked: boolean;
    gptEventsHooked: boolean;
    prebidHooked: boolean;
    lastPbjsHookAttemptAt?: number;
    lastGptHookAttemptAt?: number;
  };

  gam: {
    slotsDefined: Array<{ t: number; slot: GamSlotSummary; via: 'defineSlot' | 'cmd.push' | 'scan' }>;
    events: GamEventRecord[];
    targeting?: Record<string, unknown[]>;
    eventLog: {
      polls: GamEventLogSnapshot[];
      lastLength: number;
    };
    refresh: {
      slotRequestCounts: Record<string, number>;
      cycles: RefreshCycleSummary[];
      totalRefreshes: number;
    };
    race: {
      findings: RaceConditionFinding[];
      lastAnalyzedAt: number | null;
    };
  } | null;

  prebid: {
    events: PrebidEventRecord[];
    eventLog?: unknown;
    lastEventLogAt?: number;
  } | null;

  debug: {
    cmdPushCalls: BridgeTimingEvent[];
  };
}

function isObject(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function injectBridge(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      (function () {
        const w = window as any;

        const now = () => Date.now();
        const safeErr = (e: unknown) => (e && typeof (e as any).message === 'string' ? (e as any).message : String(e));

        const snapshot: any = {
        version: 'bridge-enhanced@1',
        timestamp: null,
        error: null,
        hooks: {
          installedAt: now(),
          gptCmdHooked: false,
          gptEventsHooked: false,
          prebidHooked: false,
        },
        gam: {
          slotsDefined: [],
          events: [],
          eventLog: { polls: [], lastLength: 0 },
          refresh: { slotRequestCounts: {}, cycles: [], totalRefreshes: 0 },
          race: { findings: [], lastAnalyzedAt: null },
        },
        prebid: {
          events: [],
        },
        debug: {
          cmdPushCalls: [],
        },
      };

      w.__adTechSnapshot = snapshot;

      const pushErrorOnce = (msg: string) => {
        snapshot.error = snapshot.error ?? msg;
      };

      const getSlotKey = (slotLike: any): string | null => {
        try {
          const slotId = typeof slotLike?.getSlotElementId === 'function' ? slotLike.getSlotElementId() : undefined;
          const adUnitPath = typeof slotLike?.getAdUnitPath === 'function' ? slotLike.getAdUnitPath() : undefined;
          if (typeof slotId === 'string' && slotId) return slotId;
          if (typeof adUnitPath === 'string' && adUnitPath) return adUnitPath;
        } catch {
          // ignore
        }
        return null;
      };

      const summarizeSlot = (slotLike: any): GamSlotSummary => {
        const out: GamSlotSummary = {};
        try {
          if (typeof slotLike?.getSlotElementId === 'function') out.elementId = slotLike.getSlotElementId();
        } catch {
          // ignore
        }
        try {
          if (typeof slotLike?.getAdUnitPath === 'function') out.adUnitPath = slotLike.getAdUnitPath();
        } catch {
          // ignore
        }
        try {
          if (typeof slotLike?.getSlotId === 'function') {
            const id = slotLike.getSlotId();
            if (id && typeof id.getId === 'function') out.slotId = id.getId();
          }
        } catch {
          // ignore
        }
        try {
          const sizes = typeof slotLike?.getSizes === 'function' ? slotLike.getSizes() : null;
          if (Array.isArray(sizes)) {
            const parsed: Array<[number, number]> = [];
            for (const s of sizes) {
              const x = typeof s?.getWidth === 'function' ? s.getWidth() : s?.width;
              const y = typeof s?.getHeight === 'function' ? s.getHeight() : s?.height;
              if (typeof x === 'number' && typeof y === 'number') parsed.push([x, y]);
            }
            if (parsed.length) out.sizes = parsed;
          }
        } catch {
          // ignore
        }
        return out;
      };

      const recordSlotDefined = (slotLike: any, via: 'defineSlot' | 'cmd.push' | 'scan') => {
        if (!snapshot.gam) return;
        const slot = summarizeSlot(slotLike);
        // Best-effort de-dupe by elementId/adUnitPath
        const key = slot.elementId || slot.slotId || slot.adUnitPath;
        if (key) {
          const already = snapshot.gam.slotsDefined.some((x) => {
            const k = x.slot.elementId || x.slot.slotId || x.slot.adUnitPath;
            return k === key;
          });
          if (already) return;
        }
        snapshot.gam.slotsDefined.push({ t: now(), slot, via });
      };

      const hookGptDefineSlot = () => {
        const g = w.googletag;
        if (!g || !snapshot.gam) return false;

        try {
          if (!g.__adtech_defineSlot_hooked && typeof g.defineSlot === 'function') {
            const orig = g.defineSlot;
            g.defineSlot = function (...args: any[]) {
              const slot = orig.apply(this, args);
              try {
                recordSlotDefined(slot, 'defineSlot');
              } catch {
                // ignore
              }
              return slot;
            };
            g.__adtech_defineSlot_hooked = true;
          }
        } catch (e) {
          pushErrorOnce(`gpt-defineSlot-hook:${safeErr(e)}`);
        }

        try {
          if (!g.__adtech_defineOOP_hooked && typeof g.defineOutOfPageSlot === 'function') {
            const orig = g.defineOutOfPageSlot;
            g.defineOutOfPageSlot = function (...args: any[]) {
              const slot = orig.apply(this, args);
              try {
                recordSlotDefined(slot, 'defineSlot');
              } catch {
                // ignore
              }
              return slot;
            };
            g.__adtech_defineOOP_hooked = true;
          }
        } catch (e) {
          pushErrorOnce(`gpt-defineOOP-hook:${safeErr(e)}`);
        }

        return true;
      };

      const hookGptEvents = () => {
        const g = w.googletag;
        if (!g || !snapshot.gam) return false;
        if (snapshot.hooks.gptEventsHooked) return true;

        try {
          if (typeof g.pubads !== 'function') return false;
          const pubads = g.pubads();
          if (!pubads || typeof pubads.addEventListener !== 'function') return false;

          const add = (name: GamEventName) => {
            try {
              pubads.addEventListener(name as any, (ev: any) => {
                try {
                  const slot = ev?.slot;
                  const rec: GamEventRecord = {
                    t: now(),
                    name,
                    slot: slot ? summarizeSlot(slot) : undefined,
                    isEmpty: typeof ev?.isEmpty === 'boolean' ? ev.isEmpty : undefined,
                    creativeId: ev?.creativeId,
                    lineItemId: ev?.lineItemId,
                    advertiserId: ev?.advertiserId,
                    campaignId: ev?.campaignId,
                    size: ev?.size,
                    raw: isObject(ev) ? (ev as any) : undefined,
                  };
                  snapshot.gam!.events.push(rec);

                  if (name === 'slotRequested') {
                    const key = getSlotKey(slot) || rec.slot?.elementId || rec.slot?.adUnitPath;
                    if (key) {
                      const prev = snapshot.gam!.refresh.slotRequestCounts[key] || 0;
                      const next = prev + 1;
                      snapshot.gam!.refresh.slotRequestCounts[key] = next;
                      if (next >= 2) {
                        snapshot.gam!.refresh.totalRefreshes += 1;
                        snapshot.gam!.refresh.cycles.push({ t: rec.t, slotKey: key, requestCount: next });
                      }
                    }
                  }
                } catch (e) {
                  pushErrorOnce(`gpt-event-${name}:${safeErr(e)}`);
                }
              });
            } catch (e) {
              pushErrorOnce(`gpt-addListener-${name}:${safeErr(e)}`);
            }
          };

          add('slotRequested');
          add('slotRenderEnded');
          add('impressionViewable');

          snapshot.hooks.gptEventsHooked = true;
          return true;
        } catch (e) {
          pushErrorOnce(`gpt-events-hook:${safeErr(e)}`);
          return false;
        }
      };

      // HTL-style: hook googletag.cmd.push to wrap commands immediately
      const hookGptCmdPush = () => {
        try {
          const g = (w.googletag = w.googletag || {});
          const cmd = (g.cmd = g.cmd || []);

          // If cmd isn't a real array, bail safely.
          const isArrayLike = Array.isArray(cmd);
          if (!isArrayLike || typeof cmd.push !== 'function') return false;

          if (cmd.__adtech_patched) {
            snapshot.hooks.gptCmdHooked = true;
            return true;
          }

          const originalPush = cmd.push.bind(cmd);

          cmd.push = function (...items: any[]) {
            const t = now();
            snapshot.debug.cmdPushCalls.push({ t, name: 'googletag.cmd.push', data: { count: items.length } });

            const wrapped = items.map((it) => {
              if (typeof it !== 'function') return it;
              return function () {
                let result: any;
                try {
                  // Ensure defineSlot is hooked before executing queued commands.
                  hookGptDefineSlot();
                  result = it.apply(this, arguments as any);
                } catch (e) {
                  pushErrorOnce(`gpt-cmd-fn:${safeErr(e)}`);
                }

                // After command executes, scan slots quickly (captures "immediate" definitions).
                try {
                  const gg = w.googletag;
                  if (gg && typeof gg.pubads === 'function') {
                    const pubads = gg.pubads();
                    const slots = pubads?.getSlots?.() || [];
                    if (Array.isArray(slots)) {
                      for (const s of slots) recordSlotDefined(s, 'cmd.push');
                    }
                  }
                } catch {
                  // ignore
                }

                // Try attaching GAM listeners as soon as pubads is usable.
                try {
                  hookGptEvents();
                } catch {
                  // ignore
                }

                return result;
              };
            });

            return originalPush(...wrapped);
          };

          cmd.__adtech_patched = true;
          snapshot.hooks.gptCmdHooked = true;

          // Also process anything that was pushed pre-hook (best effort).
          try {
            for (const it of cmd) {
              if (typeof it === 'function') {
                // execute through our wrapped push pathway to get the same behavior
                cmd.push(it);
              }
            }
          } catch {
            // ignore
          }

          return true;
        } catch (e) {
          pushErrorOnce(`gpt-cmd-hook:${safeErr(e)}`);
          return false;
        }
      };

      // Professor Prebid-style: pbjs.onEvent + periodic getEventLog() snapshotting
      const hookPrebid = () => {
        const pbjs = w.pbjs;
        if (!pbjs || !snapshot.prebid) return false;
        if (snapshot.hooks.prebidHooked) return true;

        try {
          if (typeof pbjs.onEvent !== 'function') return false;

          const add = (name: PrebidEventName) => {
            try {
              pbjs.onEvent(name, (data: any) => {
                try {
                  const rec: PrebidEventRecord = {
                    t: now(),
                    name,
                    auctionId: typeof data?.auctionId === 'string' ? data.auctionId : typeof data?.auctionID === 'string' ? data.auctionID : undefined,
                    adUnitCode: typeof data?.adUnitCode === 'string' ? data.adUnitCode : undefined,
                    bidder: typeof data?.bidderCode === 'string' ? data.bidderCode : typeof data?.bidder === 'string' ? data.bidder : undefined,
                    cpm: typeof data?.cpm === 'number' ? data.cpm : undefined,
                    currency: typeof data?.currency === 'string' ? data.currency : undefined,
                    status: typeof data?.statusMessage === 'string' ? data.statusMessage : undefined,
                    timeToRespond: typeof data?.timeToRespond === 'number' ? data.timeToRespond : undefined,
                    raw: isObject(data) ? data : undefined,
                  };
                  snapshot.prebid!.events.push(rec);
                } catch (e) {
                  pushErrorOnce(`prebid-event-${name}:${safeErr(e)}`);
                }
              });
            } catch (e) {
              pushErrorOnce(`prebid-onEvent-${name}:${safeErr(e)}`);
            }
          };

          add('auctionInit');
          add('auctionEnd');
          add('bidWon');
          add('bidResponse');

          snapshot.hooks.prebidHooked = true;
          return true;
        } catch (e) {
          pushErrorOnce(`prebid-hook:${safeErr(e)}`);
          return false;
        }
      };

      const analyzeGptEventLog = (rawLog: unknown[]) => {
        if (!snapshot.gam) return;

        // Heuristic analysis: we try to infer per-slot ordering from event types if present.
        // We keep this resilient to varying GPT log shapes.
        const slotState: Record<
          string,
          {
            sawRequested?: boolean;
            sawRendered?: boolean;
            sawImpression?: boolean;
            requestCount?: number;
          }
        > = {};

        const getType = (entry: any): string | null => {
          if (!entry) return null;
          const t =
            typeof entry.eventType === 'string'
              ? entry.eventType
              : typeof entry.type === 'string'
                ? entry.type
                : typeof entry.eventName === 'string'
                  ? entry.eventName
                  : typeof entry.name === 'string'
                    ? entry.name
                    : null;
          return t;
        };

        const getSlotish = (entry: any): any => entry?.slot || entry?.event?.slot || entry?.args?.slot || entry?.data?.slot;

        for (const entry of rawLog) {
          const type = getType(entry as any) || 'unknown';
          const slotLike = getSlotish(entry as any);
          const key = getSlotKey(slotLike) || (typeof (entry as any)?.slotId === 'string' ? (entry as any).slotId : null) || (typeof (entry as any)?.divId === 'string' ? (entry as any).divId : null);

          if (!key) continue;
          const state = (slotState[key] = slotState[key] || { requestCount: 0 });

          if (type.includes('slotRequested')) {
            state.requestCount = (state.requestCount || 0) + 1;
            if (state.requestCount >= 2) {
              snapshot.gam.refresh.totalRefreshes += 1;
              snapshot.gam.refresh.cycles.push({ t: now(), slotKey: key, requestCount: state.requestCount });
              snapshot.gam.refresh.slotRequestCounts[key] = state.requestCount;
            } else {
              snapshot.gam.refresh.slotRequestCounts[key] = state.requestCount;
            }
            state.sawRequested = true;
          }

          if (type.includes('slotRenderEnded')) {
            if (!state.sawRequested) {
              snapshot.gam.race.findings.push({
                t: now(),
                type: 'renderBeforeRequest',
                slotKey: key,
                detail: 'Observed render before any request in analyzed event log window.',
              });
            }
            state.sawRendered = true;
          }

          if (type.includes('impressionViewable')) {
            if (!state.sawRendered) {
              snapshot.gam.race.findings.push({
                t: now(),
                type: 'impressionBeforeRender',
                slotKey: key,
                detail: 'Observed impression before render in analyzed event log window.',
              });
            }
            state.sawImpression = true;
          }
        }

        snapshot.gam.race.lastAnalyzedAt = now();
      };

      const pollGptEventLog = () => {
        if (!snapshot.gam) return;

        try {
          const g = w.googletag;
          if (!g || typeof g.getEventLog !== 'function') return;

          const t = now();
          let log: unknown[] = [];
          try {
            const got = g.getEventLog();
            log = Array.isArray(got) ? got : [];
          } catch (e) {
            snapshot.gam.eventLog.polls.push({ t, ok: false });
            pushErrorOnce(`gpt-getEventLog:${safeErr(e)}`);
            return;
          }

          const last = snapshot.gam.eventLog.lastLength || 0;
          const len = log.length;
          const delta = len - last;
          snapshot.gam.eventLog.lastLength = len;

          const sample = log.slice(Math.max(0, len - 5));
          const sampleTypes = sample
            .map((x: any) => (x && (x.eventType || x.type || x.eventName || x.name)) as any)
            .filter((v: any) => typeof v === 'string')
            .slice(0, 5) as string[];

          snapshot.gam.eventLog.polls.push({
            t,
            ok: true,
            length: len,
            delta,
            sampleTypes,
            rawSample: sample as any,
          });

          // Only analyze when new events appear (reduces work).
          if (delta > 0) analyzeGptEventLog(log);
        } catch (e) {
          pushErrorOnce(`gpt-eventLog-poll:${safeErr(e)}`);
        }
      };

      const pollPrebidEventLog = () => {
        if (!snapshot.prebid) return;
        try {
          const pbjs = w.pbjs;
          if (!pbjs || typeof pbjs.getEvents !== 'function') return; // not always available
          // Some Prebid builds expose getEvents(), others getEventLog(); handle both.
          const log =
            typeof pbjs.getEventLog === 'function'
              ? pbjs.getEventLog()
              : typeof pbjs.getEvents === 'function'
                ? pbjs.getEvents()
                : undefined;

          if (log !== undefined) {
            snapshot.prebid.eventLog = log;
            snapshot.prebid.lastEventLogAt = now();
          }
        } catch (e) {
          pushErrorOnce(`prebid-eventLog:${safeErr(e)}`);
        }
      };

      const scanSlotsFallback = () => {
        if (!snapshot.gam) return;
        try {
          const g = w.googletag;
          if (!g || typeof g.pubads !== 'function') return;
          const pubads = g.pubads();
          const slots = pubads?.getSlots?.() || [];
          if (Array.isArray(slots)) {
            for (const s of slots) recordSlotDefined(s, 'scan');
          }
        } catch {
          // ignore
        }
      };

      // Install hooks as early as possible.
      try {
        hookGptCmdPush();
      } catch (e) {
        pushErrorOnce(`init-gptCmd:${safeErr(e)}`);
      }

      // Retry loop (handles missing globals gracefully, no polling for data—only for hook installation).
      const installTimer = setInterval(() => {
        snapshot.timestamp = now();

        try {
          snapshot.hooks.lastGptHookAttemptAt = now();
          hookGptDefineSlot();
          hookGptEvents();
          scanSlotsFallback();
        } catch (e) {
          pushErrorOnce(`install-gpt:${safeErr(e)}`);
        }

        try {
          snapshot.hooks.lastPbjsHookAttemptAt = now();
          hookPrebid();
        } catch (e) {
          pushErrorOnce(`install-prebid:${safeErr(e)}`);
        }

        // Stop trying once both are installed (or after a reasonable time).
        const ready = snapshot.hooks.gptCmdHooked && (snapshot.hooks.gptEventsHooked || !!w.googletag) && (snapshot.hooks.prebidHooked || !w.pbjs);
        if (ready) {
          clearInterval(installTimer);
        }
      }, 250);

      // Required: analyze googletag.getEventLog() every 5s for race conditions + refresh tracking
      setInterval(() => {
        snapshot.timestamp = now();
        pollGptEventLog();
        pollPrebidEventLog();
      }, 5000);
      })();
    } catch (e) {
      console.error('[bridge-enhanced] IIFE failed:', e);
      (window as any).__bridgeError = e;
    }
  });
}

export async function extractBridgeData(page: Page): Promise<AdTechSnapshotEnhanced | null> {
  return page.evaluate(() => (window as any).__adTechSnapshot ?? null);
}
