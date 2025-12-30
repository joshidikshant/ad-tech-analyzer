import { AnalysisResult } from './network-analyzer.js';
import { ConsoleMessage } from '../collector/console-capture.js';
import type { CorrelatedAuction, GamEvent } from '../collector/gam-events.js';
import { correlateAuctions } from '../collector/gam-events.js';

export interface AuctionMetrics {
  auctionCount: number;
  bidCount: number;
  winningBidCount: number;
  avgCpm: number | null;
  timeoutRate: number | null; // 0..1, based on statusMessage containing "timeout"
  winnerDistribution: Record<string, number>;
}

/**
 * Hybrid analysis result combining network detection with runtime config
 */
export interface HybridResult extends AnalysisResult {
  runtimeConfig?: {
    prebid?: any;
    gam?: any;
  };
  consoleMessages: ConsoleMessage[];
  validations: {
    networkVsRuntime: string[];
  };

  auctions?: CorrelatedAuction[];
  auctionMetrics: AuctionMetrics;
}

function normalizeVendor(name: string): string {
  return name.trim().toLowerCase();
}

function computeAuctionMetrics(auctions: CorrelatedAuction[] | undefined): AuctionMetrics {
  const list = auctions ?? [];
  const winnerDistribution: Record<string, number> = {};

  let bidCount = 0;
  let winningBidCount = 0;

  let winningCpmSum = 0;
  let winningCpmN = 0;

  let timeoutN = 0;
  let timeoutDenom = 0;

  for (const a of list) {
    const bids = a.prebid.auction?.bids ?? [];
    const winners = a.prebid.auction?.winningBids ?? [];
    bidCount += bids.length + winners.length;

    for (const b of [...bids, ...winners]) {
      const msg = (b.statusMessage ?? '').toLowerCase();
      if (msg) {
        timeoutDenom += 1;
        if (msg.includes('timeout')) timeoutN += 1;
      }
    }

    const w = a.prebid.winningBid;
    if (w) {
      winningBidCount += 1;
      const bidder = (w.bidderCode && w.bidderCode.trim()) || 'unknown';
      winnerDistribution[bidder] = (winnerDistribution[bidder] ?? 0) + 1;

      if (typeof w.cpm === 'number' && Number.isFinite(w.cpm)) {
        winningCpmSum += w.cpm;
        winningCpmN += 1;
      }
    }
  }

  return {
    auctionCount: list.length,
    bidCount,
    winningBidCount,
    avgCpm: winningCpmN ? winningCpmSum / winningCpmN : null,
    timeoutRate: timeoutDenom ? timeoutN / timeoutDenom : null,
    winnerDistribution,
  };
}

/**
 * Merges network analysis with runtime config and console messages.
 * Validates that network-detected vendors match runtime availability.
 *
 * Signature remains compatible; `gamEvents` is optional.
 */
export function mergeResults(
  network: AnalysisResult,
  runtime: any,
  consoleMessages: ConsoleMessage[],
  gamEvents?: GamEvent[]
): HybridResult {
  const runtimeConfig = runtime ?? {};
  const validations: string[] = [];

  const networkVendorNames = (network.vendors ?? []).map((v) => normalizeVendor(v.name));

  const hasNetworkPrebid = networkVendorNames.some((name) => name.includes('prebid'));
  if (hasNetworkPrebid && !runtimeConfig.prebid) {
    validations.push(
      'Network detected Prebid.js but runtime config is missing. Possible causes: script blocked, async loading, or false positive.'
    );
  }

  const hasNetworkGam =
    networkVendorNames.includes('gam') ||
    networkVendorNames.includes('google ad manager') ||
    networkVendorNames.some((name) => name.includes('googletag'));
  if (hasNetworkGam && !runtimeConfig.gam) {
    validations.push(
      'Network detected GAM but runtime config is missing. Possible causes: GPT not initialized, blocked, or false positive.'
    );
  }

  if (runtimeConfig.prebid && !hasNetworkPrebid) {
    validations.push(
      'Runtime has Prebid.js config but network did not detect Prebid requests. Possible causes: no bids sent yet, or pattern mismatch.'
    );
  }
  if (runtimeConfig.gam && !hasNetworkGam) {
    validations.push(
      'Runtime has GAM config but network did not detect GAM requests. Possible causes: no ads rendered yet, or pattern mismatch.'
    );
  }

  const correlatedAuctions = correlateAuctions(
    runtimeConfig?.prebid?.extracted ?? null,
    gamEvents ?? [],
    runtimeConfig?.gam?.targeting ?? null
  );

  const auctions = correlatedAuctions.length ? correlatedAuctions : undefined;

  return {
    ...network,
    runtimeConfig: Object.keys(runtimeConfig).length ? runtimeConfig : undefined,
    consoleMessages: consoleMessages ?? [],
    validations: { networkVsRuntime: validations },
    auctions,
    auctionMetrics: computeAuctionMetrics(auctions),
  };
}
