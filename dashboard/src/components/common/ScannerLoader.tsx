import { motion } from 'framer-motion';

interface ScannerLoaderProps {
  status?: string;
}

export default function ScannerLoader({ status = 'Analyzing...' }: ScannerLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Radar Scanner Animation */}
      <div className="relative w-40 h-40 mb-8">
        {/* Outer rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 border-2 border-cyber-accent-primary/30 rounded-full"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.5, 1.2, 1.5],
              opacity: [0.8, 0.4, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: ring * 0.4,
              ease: 'easeOut'
            }}
          />
        ))}

        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            className="w-4 h-4 bg-cyber-accent-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </motion.div>

        {/* Rotating scan line */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-accent-secondary to-transparent" />
        </motion.div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--color-accent-primary) 1px, transparent 1px),
              linear-gradient(to bottom, var(--color-accent-primary) 1px, transparent 1px)
            `,
            backgroundSize: '10px 10px'
          }}
        />
      </div>

      {/* Status Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-xl font-display font-bold text-cyber-accent-primary mb-2">
          {status}
        </h3>
        <p className="text-sm font-mono text-cyber-text-secondary">
          Capturing network requests and analyzing ad-tech stack
        </p>

        {/* Loading dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className="w-2 h-2 bg-cyber-accent-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: dot * 0.2
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
