import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'secondary';
  animate?: boolean;
}

export default function GlowCard({
  children,
  className = '',
  glowColor = 'primary',
  animate = true
}: GlowCardProps) {
  const glowClass = glowColor === 'primary' ? 'glow-border' : 'glow-border-secondary';

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const CardComponent = animate ? motion.div : 'div';
  const motionProps = animate ? {
    initial: 'hidden',
    animate: 'visible',
    variants: cardVariants,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as any }
  } : {};

  return (
    <CardComponent
      className={`
        relative overflow-hidden
        bg-cyber-bg-secondary/50 backdrop-blur-md
        border border-cyber-accent-primary/30
        rounded-lg p-6
        ${glowClass}
        ${className}
      `}
      {...motionProps}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-accent-primary) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-accent-primary) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </CardComponent>
  );
}
