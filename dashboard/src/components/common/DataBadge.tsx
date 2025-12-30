import { motion } from 'framer-motion';

interface DataBadgeProps {
  label: string;
  category?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export default function DataBadge({
  label,
  category,
  variant = 'default',
  size = 'md'
}: DataBadgeProps) {
  const variantStyles = {
    default: 'bg-cyber-bg-tertiary/80 border-cyber-text-tertiary/30 text-cyber-text-primary',
    success: 'bg-cyber-success/10 border-cyber-success/50 text-cyber-success',
    warning: 'bg-cyber-warning/10 border-cyber-warning/50 text-cyber-warning',
    error: 'bg-cyber-error/10 border-cyber-error/50 text-cyber-error',
    info: 'bg-cyber-info/10 border-cyber-info/50 text-cyber-info'
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <motion.span
      className={`
        inline-flex items-center gap-2
        font-mono
        border
        rounded
        backdrop-blur-sm
        transition-all duration-200
        hover:scale-105 hover:brightness-125
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {category && (
        <span className="opacity-60 text-xs uppercase tracking-wider">
          {category}
        </span>
      )}
      <span>{label}</span>
    </motion.span>
  );
}
