import type { Page } from 'playwright';
import type { ExtractedPrebidBid, PrebidAuctionExtract } from './bridge';

type UnknownRecord = Record<string, unknown>;

/**
 * GAM (Google Ad Manager) event from googletag.pubads().getEventLog()
 */
export interface GamEvent {
  type: string;
  timestamp: number;
  slot?: string;
  serviceName?: string;
}

export interface PrebidTargetingKeys {
  hb_bidder?: string;
  hb_pb?: string;
  hb_adid?: string;
  hb_auction?: string;
}

export interface CorrelatedAuction {
  auctionId: string;

  prebid: {
    auctionStartTs: number | null;
    auctionEndTs: number | null;
    auctionDurationMs: number | null;
    auction?: PrebidAuctionExtract;
    winningBid?: ExtractedPrebidBid | null;
  };

  gam: {
    targeting: PrebidTargetingKeys;
    requestTs: number | null;
    renderTs: number | null;
    slot?: string | null;
  };

  metrics: {
    gamLatencyMs: number | null; // GAM request - Prebid auction end
    totalTimeMs: number | null; // GAM render - Prebid auction start
  };
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length) return value;
  if (Array.isArray(value)) {
    const v = value.find((x) => typeof x === 'string' && x.length);
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

/**
 * Extract common Prebid targeting keys from GAM (pubads) targeting snapshot.
 * Expects a structure like snapshot.gam.targeting: Record<string, unknown[]>
 */
export function parsePrebidTargetingFromGam(
  gamTargeting: Record<string, unknown[]> | null | undefined
): PrebidTargetingKeys {
  if (!gamTargeting) return {};
  return {
    hb_bidder: firstString(gamTargeting['hb_bidder']),
    hb_pb: firstString(gamTargeting['hb_pb']),
    hb_adid: firstString(gamTargeting['hb_adid']),
    hb_auction: firstString(gamTargeting['hb_auction']),
  };
}

function pickWinningBid(auction: PrebidAuctionExtract | undefined): ExtractedPrebidBid | null {
  if (!auction) return null;
  const winners = Array.isArray(auction.winningBids) ? auction.winningBids : [];
  if (winners.length === 1) return winners[0];
  if (winners.length > 1) {
    return [...winners].sort((a, b) => (b.cpm ?? -1) - (a.cpm ?? -1))[0] ?? null;
  }
  const bids = Array.isArray(auction.bids) ? auction.bids : [];
  if (!bids.length) return null;
  return [...bids].sort((a, b) => (b.cpm ?? -1) - (a.cpm ?? -1))[0] ?? null;
}

function computeAuctionBounds(auction: PrebidAuctionExtract | undefined): {
  startTs: number | null;
  endTs: number | null;
} {
  if (!auction) return { startTs: null, endTs: null };
  const bids = [...(auction.bids ?? []), ...(auction.winningBids ?? [])].filter(Boolean);
  const requestTs = bids.map((b) => b.requestTimestamp).filter((n): n is number => typeof n === 'number');
  const responseTs = bids
    .map((b) => b.responseTimestamp)
    .filter((n): n is number => typeof n === 'number');

  const startTs =
    requestTs.length ? Math.min(...requestTs) : typeof auction.firstSeenAt === 'number' ? auction.firstSeenAt : null;

  const endTs = responseTs.length ? Math.max(...responseTs) : null;

  return { startTs, endTs };
}

function findFirstEventAfter(events: GamEvent[], types: string[], afterTs: number): GamEvent | null {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.find((e) => types.includes(e.type) && e.timestamp >= afterTs) ?? null;
}

function findFirstEventAfterMaybe(events: GamEvent[], types: string[], afterTs: number | null): GamEvent | null {
  if (afterTs == null) {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.find((e) => types.includes(e.type)) ?? null;
  }
  return findFirstEventAfter(events, types, afterTs);
}

function diffMs(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return a - b;
}

/**
 * Correlate Prebid auctions with GAM ad requests/renders via hb_auction targeting.
 *
 * @param bidData Prebid extracted snapshot data (bridge.ts) containing auctions map
 * @param gamEvents GAM events from captureGamEvents()
 * @param gamTargeting GAM targeting snapshot (bridge.ts snapshot.gam.targeting)
 */
export function correlateAuctions(
  bidData:
    | {
        auctions?: Record<string, PrebidAuctionExtract>;
        auctionIds?: string[];
      }
    | null
    | undefined,
  gamEvents: GamEvent[],
  gamTargeting: Record<string, unknown[]> | null | undefined
): CorrelatedAuction[] {
  const auctionsMap = bidData?.auctions ?? {};
  const targeting = parsePrebidTargetingFromGam(gamTargeting);

  const auctionIdsFromGam = new Set<string>();
  if (targeting.hb_auction) auctionIdsFromGam.add(targeting.hb_auction);

  const auctionIdsFromPrebid = Array.isArray(bidData?.auctionIds) ? bidData!.auctionIds! : Object.keys(auctionsMap);

  const allAuctionIds = new Set<string>([...auctionIdsFromPrebid, ...auctionIdsFromGam]);

  const out: CorrelatedAuction[] = [];
  for (const auctionId of allAuctionIds) {
    const auction = auctionsMap[auctionId];
    const winningBid = pickWinningBid(auction);
    const { startTs, endTs } = computeAuctionBounds(auction);

    const gamRequest = findFirstEventAfterMaybe(gamEvents, ['slotRequested', 'request'], endTs ?? startTs);
    const gamRender = gamRequest
      ? findFirstEventAfterMaybe(gamEvents, ['slotRenderEnded', 'slotOnload', 'impressionViewable'], gamRequest.timestamp)
      : findFirstEventAfterMaybe(gamEvents, ['slotRenderEnded', 'slotOnload', 'impressionViewable'], endTs ?? startTs);

    out.push({
      auctionId,
      prebid: {
        auctionStartTs: startTs,
        auctionEndTs: endTs,
        auctionDurationMs: diffMs(endTs, startTs),
        auction,
        winningBid,
      },
      gam: {
        targeting: auctionId === targeting.hb_auction ? targeting : { ...targeting, hb_auction: auctionId },
        requestTs: gamRequest?.timestamp ?? null,
        renderTs: gamRender?.timestamp ?? null,
        slot: gamRequest?.slot ?? gamRender?.slot ?? null,
      },
      metrics: {
        gamLatencyMs: diffMs(gamRequest?.timestamp ?? null, endTs ?? null),
        totalTimeMs: diffMs(gamRender?.timestamp ?? null, startTs ?? null),
      },
    });
  }

  // Prefer showing the auction referenced by GAM targeting first
  return out.sort((a, b) => Number(b.auctionId === targeting.hb_auction) - Number(a.auctionId === targeting.hb_auction));
}

/**
 * Captures GAM event log from page context.
 *
 * Uses googletag.pubads().getEventLog().getAllEvents() if available.
 * Gracefully returns empty array if:
 * - googletag not defined
 * - pubads() not initialized
 * - getEventLog() not available (older GPT versions, consent issues)
 *
 * @param page Playwright page to evaluate
 * @returns Array of GAM events or empty array if unavailable
 */
export async function captureGamEvents(page: Page): Promise<GamEvent[]> {
  const events = await page.evaluate(() => {
    const gt = (window as any).googletag;
    const pubads = gt?.pubads?.();
    const getEventLog = pubads?.getEventLog?.();

    // Feature detection: getEventLog not always available
    if (!getEventLog?.getAllEvents) {
      return [];
    }

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

/**
 * Analyzes GAM events to detect race conditions and timing issues.
 *
 * Detects:
 * 1. "Fetch Before Refresh" - slotRequested fired before refresh() called
 * 2. "Targeting After Request" - setTargeting called after ad request sent
 *
 * These conditions often cause bid failures or targeting mismatches.
 *
 * @param events Array of GAM events from captureGamEvents()
 * @returns Array of warning strings describing detected issues
 */
export function detectRaceConditions(events: GamEvent[]): string[] {
  const warnings: string[] = [];

  // Sort events by timestamp for timeline analysis
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Race Condition 1: Fetch Before Refresh
  const firstRefresh = sorted.find((e) => e.type === 'refresh');
  const firstSlotRequest = sorted.find((e) => e.type === 'slotRequested');

  if (firstRefresh && firstSlotRequest && firstSlotRequest.timestamp < firstRefresh.timestamp) {
    warnings.push(
      'Fetch Before Refresh: slot requested before refresh() called. ' +
        'This can cause ads to render without latest targeting or bid data.'
    );
  }

  // Race Condition 2: Targeting After Request
  const firstSetTargetingBySlot = new Map<string | undefined, GamEvent>();

  for (const e of sorted) {
    // Track first slotRequested per slot
    if (e.type === 'slotRequested' && !firstSetTargetingBySlot.has(e.slot)) {
      firstSetTargetingBySlot.set(e.slot, e);
    }

    // Check if setTargeting happened after request
    if (e.type === 'setTargeting') {
      const req = firstSetTargetingBySlot.get(e.slot) ?? firstSlotRequest;
      if (req && e.timestamp > req.timestamp) {
        warnings.push(
          `Targeting After Request: targeting set after ad request for slot ${e.slot ?? 'unknown'}. ` +
            'Targeting data will not be included in this ad request.'
        );
        break; // Only report first occurrence
      }
    }
  }

  return warnings;
}
