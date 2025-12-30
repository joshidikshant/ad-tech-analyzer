# Use official Playwright image with Node.js and Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install root dependencies (skip prepare script - we use tsx, not compiled JS)
RUN npm ci --ignore-scripts

# Install dashboard dependencies
WORKDIR /app/dashboard
RUN npm ci --ignore-scripts

# Copy source code
WORKDIR /app
COPY . .

# Build TypeScript (optional, tsx compiles on-the-fly)
# RUN npm run build

# Set environment variables
ENV PORT=3001
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the API server
CMD ["npx", "tsx", "dashboard/api-server-mcp-final.ts"]
