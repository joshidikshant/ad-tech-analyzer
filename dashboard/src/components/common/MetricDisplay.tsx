import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface MetricDisplayProps {
  value: number;
  label: string;
  color?: 'primary' | 'secondary' | 'tertiary';
  suffix?: string;
  icon?: React.ReactNode;
  animate?: boolean;
}

export default function MetricDisplay({
  value,
  label,
  color = 'primary',
  suffix = '',
  icon,
  animate: shouldAnimate = true
}: MetricDisplayProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (shouldAnimate) {
      const controls = animate(motionValue, value, {
        duration: 1.2,
        ease: 'easeOut'
      });

      const unsubscribe = rounded.on('change', (latest) => {
        setDisplayValue(latest);
      });

      return () => {
        controls.stop();
        unsubscribe();
      };
    } else {
      setDisplayValue(value);
    }
  }, [value, shouldAnimate, motionValue, rounded]);

  const colorClasses = {
    primary: 'text-cyber-accent-primary',
    secondary: 'text-cyber-accent-secondary',
    tertiary: 'text-cyber-accent-tertiary'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {icon && (
        <div className="mb-2 text-cyber-text-secondary">
          {icon}
        </div>
      )}

      <motion.div
        className={`text-5xl font-display font-bold ${colorClasses[color]} glow-text`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {displayValue}{suffix}
      </motion.div>

      <div className="mt-2 text-sm font-body uppercase tracking-wider text-cyber-text-secondary">
        {label}
      </div>
    </div>
  );
}
