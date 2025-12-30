import { Page } from 'playwright';

type UnknownRecord = Record<string, unknown>;

export interface ExtractedPrebidBid {
  adUnitCode?: string;
  bidderCode?: string;
  cpm?: number;
  currency?: string;
  auctionId?: string;
  adId?: string;
  requestTimestamp?: number;
  responseTimestamp?: number;
  timeToRespond?: number;
  statusMessage?: string;
}

export interface PrebidAuctionExtract {
  auctionId: string;
  firstSeenAt: number;
  bids: ExtractedPrebidBid[];
  winningBids: ExtractedPrebidBid[];
}

export interface AdTechSnapshot {
  prebid: {
    config?: unknown;
    bidResponses?: unknown;
    winningBids?: unknown;
    adUnits?: unknown;
    extracted?: {
      bids: ExtractedPrebidBid[];
      winningBids: ExtractedPrebidBid[];
      auctionIds: string[];
      auctions: Record<string, PrebidAuctionExtract>;
    };
  } | null;
  gam: { targeting: Record<string, unknown[]>; slots: unknown[] } | null;
  timestamp: number | null;
  error: string | null;
}

function isObject(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBid(raw: unknown): ExtractedPrebidBid | null {
  if (!isObject(raw)) return null;
  const bidderCode = (raw.bidderCode ?? raw.bidder) as unknown;
  const cpm = raw.cpm as unknown;
  const requestTimestamp = raw.requestTimestamp as unknown;
  const responseTimestamp = raw.responseTimestamp as unknown;
  const timeToRespond = raw.timeToRespond as unknown;

  return {
    adUnitCode: typeof raw.adUnitCode === 'string' ? raw.adUnitCode : undefined,
    bidderCode: typeof bidderCode === 'string' ? bidderCode : undefined,
    cpm: typeof cpm === 'number' ? cpm : undefined,
    currency: typeof raw.currency === 'string' ? raw.currency : undefined,
    auctionId:
      typeof raw.auctionId === 'string'
        ? raw.auctionId
        : typeof (raw as any).auctionID === 'string'
          ? (raw as any).auctionID
          : undefined,
    adId: typeof raw.adId === 'string' ? raw.adId : undefined,
    requestTimestamp: typeof requestTimestamp === 'number' ? requestTimestamp : undefined,
    responseTimestamp: typeof responseTimestamp === 'number' ? responseTimestamp : undefined,
    timeToRespond: typeof timeToRespond === 'number' ? timeToRespond : undefined,
    statusMessage: typeof raw.statusMessage === 'string' ? raw.statusMessage : undefined,
  };
}

/**
 * Injects a bridge script into the page context to capture ad tech runtime config.
 *
 * The bridge:
 * - Polls for window.pbjs and window.googletag every 100ms
 * - Captures Prebid.js config/bids/adUnits and GAM targeting/slots
 * - Starts after 5s delay
 * - Stops after 20s total
 * - Uses page.addInitScript (CSP-safe, no eval)
 */
export async function injectBridge(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const snapshot: AdTechSnapshot = {
      prebid: null,
      gam: null,
      timestamp: null,
      error: null,
    };

    (window as any).__adTechSnapshot = snapshot;

    const ensurePrebidContainer = () => {
      if (!snapshot.prebid) snapshot.prebid = {};
      if (!snapshot.prebid.extracted) {
        snapshot.prebid.extracted = { bids: [], winningBids: [], auctionIds: [], auctions: {} };
      }
      return snapshot.prebid;
    };

    const startPolling = () => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        const now = Date.now();

        // Prebid: getConfig()
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs && typeof pbjs.getConfig === 'function') {
            const config = pbjs.getConfig();
            if (config) ensurePrebidContainer().config = config;
          }
        } catch (err) {
          snapshot.error = snapshot.error ?? `prebid-config:${(err as Error).message}`;
        }

        // Prebid: getBidResponses() (all bids + CPMs)
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs && typeof pbjs.getBidResponses === 'function') {
            const bidResponses = pbjs.getBidResponses();
            if (bidResponses) ensurePrebidContainer().bidResponses = bidResponses;

            const prebid = ensurePrebidContainer();
            const extracted = prebid.extracted!;
            const auctions = extracted.auctions;

            const collectedBids: ExtractedPrebidBid[] = [];
            if (bidResponses && typeof bidResponses === 'object') {
              for (const [adUnitCode, resp] of Object.entries(bidResponses as any)) {
                const bids = (resp as any)?.bids;
                if (!Array.isArray(bids)) continue;
                for (const b of bids) {
                  const nb = (window as any).__normalizePbBid?.(b) ?? null;
                  const normalized = nb || null;
                  const bid = normalized && typeof normalized === 'object' ? normalized : null;
                  const parsed = bid ? (bid as any) : null;
                  const fromLocal = parsed ? parsed : null;
                  const out = fromLocal ? fromLocal : null;
                  const n = out as ExtractedPrebidBid | null;
                  const finalBid = n ?? null;
                  const normalizedBid = finalBid ?? null;

                  const safe = normalizedBid ?? null;
                  const best =
                    safe ??
                    (() => {
                      const rawBid = b as any;
                      return {
                        adUnitCode: typeof adUnitCode === 'string' ? adUnitCode : undefined,
                        bidderCode:
                          typeof rawBid?.bidderCode === 'string'
                            ? rawBid.bidderCode
                            : typeof rawBid?.bidder === 'string'
                              ? rawBid.bidder
                              : undefined,
                        cpm: typeof rawBid?.cpm === 'number' ? rawBid.cpm : undefined,
                        currency: typeof rawBid?.currency === 'string' ? rawBid.currency : undefined,
                        auctionId:
                          typeof rawBid?.auctionId === 'string'
                            ? rawBid.auctionId
                            : typeof rawBid?.auctionID === 'string'
                              ? rawBid.auctionID
                              : undefined,
                        adId: typeof rawBid?.adId === 'string' ? rawBid.adId : undefined,
                        requestTimestamp:
                          typeof rawBid?.requestTimestamp === 'number'
                            ? rawBid.requestTimestamp
                            : undefined,
                        responseTimestamp:
                          typeof rawBid?.responseTimestamp === 'number'
                            ? rawBid.responseTimestamp
                            : undefined,
                        timeToRespond:
                          typeof rawBid?.timeToRespond === 'number' ? rawBid.timeToRespond : undefined,
                        statusMessage:
                          typeof rawBid?.statusMessage === 'string' ? rawBid.statusMessage : undefined,
                      } as ExtractedPrebidBid;
                    })();

                  const merged: ExtractedPrebidBid = {
                    ...best,
                    adUnitCode: best.adUnitCode ?? adUnitCode,
                  };
                  collectedBids.push(merged);

                  if (merged.auctionId) {
                    if (!auctions[merged.auctionId]) {
                      auctions[merged.auctionId] = {
                        auctionId: merged.auctionId,
                        firstSeenAt: now,
                        bids: [],
                        winningBids: [],
                      };
                    }
                    auctions[merged.auctionId].bids.push(merged);
                  }
                }
              }
            }

            if (collectedBids.length) extracted.bids = collectedBids;

            const auctionIds = Object.keys(extracted.auctions);
            extracted.auctionIds = auctionIds;
          }
        } catch (err) {
          snapshot.error = snapshot.error ?? `prebid-bidResponses:${(err as Error).message}`;
        }

        // Prebid: getAllWinningBids() (winners per auction)
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs && typeof pbjs.getAllWinningBids === 'function') {
            const winners = pbjs.getAllWinningBids();
            if (winners) ensurePrebidContainer().winningBids = winners;

            const prebid = ensurePrebidContainer();
            const extracted = prebid.extracted!;
            const auctions = extracted.auctions;

            const winningBids: ExtractedPrebidBid[] = Array.isArray(winners)
              ? winners
                  .map((b) => normalizeBid(b) ?? null)
                  .filter((b): b is ExtractedPrebidBid => !!b)
              : [];

            extracted.winningBids = winningBids;

            for (const bid of winningBids) {
              if (!bid.auctionId) continue;
              if (!auctions[bid.auctionId]) {
                auctions[bid.auctionId] = {
                  auctionId: bid.auctionId,
                  firstSeenAt: now,
                  bids: [],
                  winningBids: [],
                };
              }
              auctions[bid.auctionId].winningBids.push(bid);
            }

            extracted.auctionIds = Object.keys(auctions);
          }
        } catch (err) {
          snapshot.error = snapshot.error ?? `prebid-winningBids:${(err as Error).message}`;
        }

        // Prebid: getAdUnits() (ad unit configs)
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs && typeof pbjs.getAdUnits === 'function') {
            const adUnits = pbjs.getAdUnits();
            if (adUnits) ensurePrebidContainer().adUnits = adUnits;
          }
        } catch (err) {
          snapshot.error = snapshot.error ?? `prebid-adUnits:${(err as Error).message}`;
        }

        // GAM (GPT): targeting + slots
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

        snapshot.timestamp = now;

        if (now - startedAt >= 20_000) clearInterval(interval);
      }, 100);
    };

    setTimeout(startPolling, 5000);
  });
}

export async function extractBridgeData(page: Page): Promise<AdTechSnapshot | null> {
  return page.evaluate(() => (window as any).__adTechSnapshot ?? null);
}
