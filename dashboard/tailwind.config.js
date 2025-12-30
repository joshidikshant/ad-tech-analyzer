export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-bg-primary': 'var(--color-bg-primary)',
        'cyber-bg-secondary': 'var(--color-bg-secondary)',
        'cyber-bg-tertiary': 'var(--color-bg-tertiary)',
        'cyber-accent-primary': 'var(--color-accent-primary)',
        'cyber-accent-secondary': 'var(--color-accent-secondary)',
        'cyber-accent-tertiary': 'var(--color-accent-tertiary)',
        'cyber-text-primary': 'var(--color-text-primary)',
        'cyber-text-secondary': 'var(--color-text-secondary)',
        'cyber-text-tertiary': 'var(--color-text-tertiary)',
        'cyber-success': 'var(--color-success)',
        'cyber-warning': 'var(--color-warning)',
        'cyber-error': 'var(--color-error)',
        'cyber-info': 'var(--color-info)',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-cyber': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-mesh': 'var(--gradient-mesh)',
      },
    },
  },
  plugins: [],
}
