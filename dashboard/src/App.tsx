import { useState } from 'react';
import { motion } from 'framer-motion';
import AnalysisView from './components/AnalysisView';
import GlowCard from './components/common/GlowCard';
import ScannerLoader from './components/common/ScannerLoader';

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

function App() {
  const [url, setUrl] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, device, timeout: 30000 })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysisData(result.data);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze site');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = async () => {
    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await fetch('/sample-data.json');
      const result = await response.json();

      if (result.success && result.data) {
        setAnalysisData(result.data);
        setUrl(result.data.url);
      } else {
        throw new Error('Invalid sample data format');
      }
    } catch (err: any) {
      console.error('Failed to load sample data:', err);
      setError(err.message || 'Failed to load sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Animated Grid Background */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-accent-primary) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-accent-primary) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'grid-fade-in 1s ease-out'
        }}
      />

      {/* Header */}
      <motion.header
        className="relative backdrop-blur-md bg-cyber-bg-secondary/30 border-b border-cyber-accent-primary/20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-display font-black text-cyber-accent-primary glow-text">
            AD TECH ANALYZER
          </h1>
          <p className="mt-2 text-sm font-mono text-cyber-text-secondary uppercase tracking-widest">
            Reverse Engineering Ad Tech Stacks
          </p>
        </div>
      </motion.header>

      <main className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Input Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <GlowCard className="mb-12">
            <div className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-cyber-text-secondary mb-3">
                  Target URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 bg-cyber-bg-tertiary/50 border border-cyber-accent-primary/30 rounded text-cyber-text-primary font-mono text-sm focus:outline-none focus:border-cyber-accent-primary focus:ring-2 focus:ring-cyber-accent-primary/20 transition-all"
                />
              </div>

              {/* Device Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-cyber-text-secondary mb-3">
                  Device
                </label>
                <div className="flex gap-4">
                  {(['desktop', 'mobile'] as const).map((deviceType) => (
                    <label
                      key={deviceType}
                      className="flex items-center cursor-pointer group"
                    >
                      <input
                        type="radio"
                        value={deviceType}
                        checked={device === deviceType}
                        onChange={(e) => setDevice(e.target.value as 'desktop' | 'mobile')}
                        className="sr-only"
                      />
                      <div className={`
                        px-6 py-2 border rounded font-mono text-sm uppercase tracking-wider
                        transition-all duration-200
                        ${device === deviceType
                          ? 'bg-cyber-accent-primary/20 border-cyber-accent-primary text-cyber-accent-primary'
                          : 'border-cyber-text-tertiary/30 text-cyber-text-secondary hover:border-cyber-accent-primary/50'
                        }
                      `}>
                        {deviceType}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <motion.button
                  onClick={handleAnalyze}
                  disabled={loading || !url}
                  className="flex-1 bg-gradient-accent text-cyber-bg-primary font-display font-bold py-3 px-6 rounded uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyber-accent-primary/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </motion.button>
                <motion.button
                  onClick={loadSampleData}
                  disabled={loading}
                  className="bg-cyber-bg-tertiary border border-cyber-accent-secondary/50 text-cyber-accent-secondary font-mono py-3 px-6 rounded uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-cyber-bg-tertiary/80 hover:border-cyber-accent-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Load Sample
                </motion.button>
              </div>
            </div>
          </GlowCard>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <GlowCard glowColor="secondary">
              <ScannerLoader status="Analyzing Website" />
            </GlowCard>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <GlowCard className="border-cyber-error/50">
              <div className="text-center py-6">
                <h3 className="text-xl font-display font-bold text-cyber-error mb-3">
                  Analysis Failed
                </h3>
                <p className="text-cyber-text-secondary font-mono text-sm">{error}</p>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {/* Results */}
        {analysisData && <AnalysisView data={analysisData} />}
      </main>
    </div>
  );
}

export default App;
