import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import GlowCard from './common/GlowCard';
import MetricDisplay from './common/MetricDisplay';
import DataBadge from './common/DataBadge';

interface AnalysisData {
  url: string;
  timestamp: string;
  device: string;
  vendors: string[];
  vendor_count: number;
  ssp_count: number;
  managed_service: string | null;
  categories: Record<string, string[]>;
  prebid: {
    detected: boolean;
    config?: any;
    bid_responses?: any;
    bidders?: string[];  // Client-side extracted bidders
    network_bidders?: string[];  // Network-inferred bidders (fallback)
    ad_formats?: string[];
    version?: string | null;
    ad_units_count?: number;
  };
  gam: {
    detected: boolean;
    slots?: any[];
    targeting?: Record<string, string[]>;
  };
  managed_services_detected: Record<string, boolean>;
  network: {
    total_requests: number;
    classified_requests: number;
  };
}

interface Props {
  data: AnalysisData;
}

// Cyberpunk color scheme for charts
const CATEGORY_COLORS: Record<string, string> = {
  managed_service: '#ff00ff',
  header_bidding: '#00ff9f',
  ad_server: '#7c3aed',
  ssp: '#00d4ff',
  analytics: '#ffaa00',
  identity: '#ff4d6d',
  consent: '#8b5cf6',
  other: '#8b949e'
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function AnalysisView({ data }: Props) {
  const [showPrebidConfig, setShowPrebidConfig] = useState(false);
  const [showGAMDetails, setShowGAMDetails] = useState(true); // Show GAM by default

  // Calculate total bidders (client-side + network-inferred)
  const totalBidders = (data.prebid.bidders?.length || 0) + (data.prebid.network_bidders?.length || 0);

  // Prepare chart data
  const categoryData = Object.entries(data.categories || {})
    .filter(([_, vendors]) => vendors && vendors.length > 0)
    .map(([category, vendors]) => ({
      name: category.replace(/_/g, ' ').toUpperCase(),
      count: vendors.length,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
    }));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    return (
      <div className="bg-cyber-bg-secondary/90 backdrop-blur-md border border-cyber-accent-primary/50 p-3 rounded-lg">
        <p className="text-cyber-text-primary font-mono text-sm font-bold">{payload[0].name}</p>
        <p className="text-cyber-accent-primary font-display text-lg">{payload[0].value}</p>
      </div>
    );
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Overview Metrics */}
      <GlowCard>
        <h2 className="text-2xl font-display font-bold text-cyber-accent-primary mb-6 uppercase tracking-wider">
          Analysis Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricDisplay
            value={data.vendor_count}
            label="Total Vendors"
            color="primary"
          />
          <MetricDisplay
            value={totalBidders}
            label="Bidders"
            color="secondary"
          />
          <MetricDisplay
            value={data.gam.slots?.length || 0}
            label="GAM Slots"
            color="tertiary"
          />
          <MetricDisplay
            value={data.network.total_requests}
            label="Network Requests"
            color="primary"
          />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-cyber-accent-primary/20">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">URL</p>
            <p className="text-sm font-mono text-cyber-text-primary truncate">{data.url}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">Device</p>
            <p className="text-sm font-mono text-cyber-accent-secondary uppercase">{data.device}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">Analyzed</p>
            <p className="text-sm font-mono text-cyber-text-primary">
              {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Managed Service Badge */}
        {data.managed_service && (
          <div className="mt-6 flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary">
              Managed Service:
            </span>
            <DataBadge label={data.managed_service} variant="info" size="lg" />
          </div>
        )}
      </GlowCard>

      {/* Vendor Distribution + Detected Vendors Side by Side */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <GlowCard glowColor="secondary">
            <h3 className="text-xl font-display font-bold text-cyber-accent-secondary mb-6 uppercase">
              Vendor Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--color-accent-primary)', strokeWidth: 1 }}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </GlowCard>

          {/* Detected Vendors */}
          <GlowCard>
            <h3 className="text-xl font-display font-bold text-cyber-accent-primary mb-6 uppercase">
              Detected Vendors
            </h3>
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
              {Object.entries(data.categories)
                .filter(([_, vendors]) => vendors && vendors.length > 0)
                .map(([category, vendors]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-1 h-5 rounded"
                        style={{ backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.other }}
                      />
                      <h4 className="text-xs font-mono uppercase tracking-wider text-cyber-text-secondary">
                        {category.replace(/_/g, ' ')} ({vendors.length})
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-3">
                      {vendors.map((vendor: string, idx: number) => (
                        <DataBadge
                          key={idx}
                          label={vendor}
                          variant="default"
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </GlowCard>
        </div>
      )}

      {/* Prebid.js Section */}
      {data.prebid.detected && (
        <GlowCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-display font-bold text-cyber-accent-primary uppercase">
                Prebid.js
              </h3>
              <span className="px-3 py-1 bg-cyber-success/20 border border-cyber-success/50 text-cyber-success rounded-full text-xs font-mono uppercase tracking-wider animate-pulse">
                Detected
              </span>
            </div>
            <button
              onClick={() => setShowPrebidConfig(!showPrebidConfig)}
              className="text-sm font-mono text-cyber-accent-secondary hover:text-cyber-accent-primary transition-colors uppercase tracking-wider"
            >
              {showPrebidConfig ? '▼ Hide Config' : '▶ Show Config'}
            </button>
          </div>

          {/* Prebid Version & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                Version
              </p>
              <p className="text-sm font-mono text-cyber-accent-primary">
                {data.prebid.version || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                Ad Units
              </p>
              <p className="text-sm font-mono text-cyber-accent-primary">
                {data.prebid.ad_units_count || 0}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                Timeout
              </p>
              <p className="text-sm font-mono text-cyber-accent-primary">
                {data.prebid.config?.bidderTimeout ? `${data.prebid.config.bidderTimeout}ms` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                Ad Formats
              </p>
              <p className="text-sm font-mono text-cyber-accent-primary">
                {data.prebid.ad_formats?.join(', ') || 'N/A'}
              </p>
            </div>
          </div>

          {/* Bidders Section */}
          {((data.prebid.bidders && data.prebid.bidders.length > 0) ||
            (data.prebid.network_bidders && data.prebid.network_bidders.length > 0)) && (
            <div className="mb-4">
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-2">
                Configured Bidders ({(data.prebid.bidders?.length || 0) + (data.prebid.network_bidders?.length || 0)})
              </p>
              <div className="flex flex-wrap gap-2">
                {data.prebid.bidders?.map((bidder, idx) => (
                  <span
                    key={`bidder-${idx}`}
                    className="px-2 py-1 bg-cyber-success/20 border border-cyber-success/50 text-cyber-success rounded text-xs font-mono uppercase"
                  >
                    {bidder}
                  </span>
                ))}
                {data.prebid.network_bidders?.map((bidder, idx) => (
                  <span
                    key={`net-bidder-${idx}`}
                    className="px-2 py-1 bg-cyber-accent-secondary/20 border border-cyber-accent-secondary/50 text-cyber-accent-secondary rounded text-xs font-mono uppercase"
                    title="Detected from network requests"
                  >
                    {bidder} ⚡
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.prebid.config && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                  Price Granularity
                </p>
                <p className="text-sm font-mono text-cyber-accent-primary">
                  {data.prebid.config.priceGranularity || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                  Currency
                </p>
                <p className="text-sm font-mono text-cyber-accent-primary">
                  {data.prebid.config.currency?.adServerCurrency || 'USD'}
                </p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-1">
                  Bid Caching
                </p>
                <p className="text-sm font-mono text-cyber-accent-primary">
                  {data.prebid.config.useBidCache ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          )}

          {showPrebidConfig && data.prebid.config && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4"
            >
              <pre className="bg-cyber-bg-tertiary/50 border border-cyber-accent-primary/30 p-4 rounded overflow-x-auto text-xs font-mono text-cyber-success">
                {JSON.stringify(data.prebid.config, null, 2)}
              </pre>
            </motion.div>
          )}
        </GlowCard>
      )}

      {/* Network-Detected Bidders (when Prebid.js not detected but bidders found) */}
      {!data.prebid.detected && data.prebid.network_bidders && data.prebid.network_bidders.length > 0 && (
        <GlowCard>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-display font-bold text-cyber-accent-secondary uppercase">
              Header Bidding Partners
            </h3>
            <span className="px-3 py-1 bg-cyber-accent-secondary/20 border border-cyber-accent-secondary/50 text-cyber-accent-secondary rounded-full text-xs font-mono uppercase tracking-wider">
              Detected via Network
            </span>
          </div>
          <p className="text-xs font-mono text-cyber-text-tertiary mb-3">
            Prebid.js configuration not accessible (managed service wrapper), but bidders detected from network requests:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.prebid.network_bidders.map((bidder, idx) => (
              <span
                key={`net-bidder-${idx}`}
                className="px-3 py-1.5 bg-cyber-accent-secondary/20 border border-cyber-accent-secondary/50 text-cyber-accent-secondary rounded text-sm font-mono uppercase"
              >
                {bidder}
              </span>
            ))}
          </div>
        </GlowCard>
      )}

      {/* Google Ad Manager Section */}
      {data.gam.detected && (
        <GlowCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-display font-bold text-cyber-accent-primary uppercase">
                Google Ad Manager
              </h3>
              <span className="px-3 py-1 bg-cyber-success/20 border border-cyber-success/50 text-cyber-success rounded-full text-xs font-mono uppercase tracking-wider animate-pulse">
                Detected
              </span>
              {data.gam.slots && data.gam.slots.length > 0 && (
                <span className="px-3 py-1 bg-cyber-bg-tertiary border border-cyber-accent-primary/30 text-cyber-accent-primary rounded text-xs font-mono">
                  {data.gam.slots.length} slots
                </span>
              )}
            </div>
            {data.gam.slots && data.gam.slots.length > 5 && (
              <button
                onClick={() => setShowGAMDetails(!showGAMDetails)}
                className="text-sm font-mono text-cyber-accent-secondary hover:text-cyber-accent-primary transition-colors uppercase tracking-wider"
              >
                {showGAMDetails ? '▼ Show Less' : `▶ Show All ${data.gam.slots.length}`}
              </button>
            )}
          </div>

          {/* Always show first 5 slots */}
          {data.gam.slots && data.gam.slots.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-3">
                Ad Unit Paths
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.gam.slots
                  .slice(0, showGAMDetails ? data.gam.slots.length : 5)
                  .map((slot: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-cyber-bg-tertiary/30 border border-cyber-accent-primary/20 px-3 py-2 rounded text-xs font-mono text-cyber-text-primary truncate"
                      title={slot.adUnitPath || slot.elementId}
                    >
                      {slot.adUnitPath || slot.elementId || `Slot ${idx + 1}`}
                    </div>
                  ))}
              </div>
              {!showGAMDetails && data.gam.slots.length > 5 && (
                <p className="text-xs font-mono text-cyber-text-tertiary mt-2">
                  +{data.gam.slots.length - 5} more slots
                </p>
              )}
            </div>
          )}

          {/* Targeting (if available) */}
          {data.gam.targeting && Object.keys(data.gam.targeting).length > 0 && (
            <div className="mt-4 pt-4 border-t border-cyber-accent-primary/20">
              <p className="text-xs font-mono uppercase tracking-wider text-cyber-text-tertiary mb-2">
                Page-Level Targeting
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.gam.targeting).slice(0, 10).map(([key, values]) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-cyber-bg-tertiary border border-cyber-accent-secondary/30 text-cyber-text-secondary rounded text-xs font-mono"
                    title={`${key}: ${Array.isArray(values) ? values.join(', ') : values}`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlowCard>
      )}

      {/* Detected Vendors */}
      {Object.keys(data.categories).length > 0 && (
        <GlowCard>
          <h3 className="text-2xl font-display font-bold text-cyber-accent-primary mb-6 uppercase">
            Detected Vendors
          </h3>

          <div className="space-y-6">
            {Object.entries(data.categories)
              .filter(([_, vendors]) => vendors && vendors.length > 0)
              .map(([category, vendors]) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-1 h-6 rounded"
                      style={{ backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.other }}
                    />
                    <h4 className="text-sm font-mono uppercase tracking-wider text-cyber-text-secondary">
                      {category.replace(/_/g, ' ')} ({vendors.length})
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {vendors.map((vendor: string, idx: number) => (
                      <DataBadge
                        key={idx}
                        label={vendor}
                        variant="default"
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </GlowCard>
      )}

    </motion.div>
  );
}
