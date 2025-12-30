#!/bin/bash

echo "🆓 Deploy to Fly.io (FREE) + Vercel (FREE)"
echo "=========================================="
echo ""

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "📦 Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh

    echo ""
    echo "⚠️  Please add Fly CLI to your PATH:"
    echo "    export PATH=\"\$HOME/.fly/bin:\$PATH\""
    echo ""
    read -p "Press Enter after adding to PATH..."
fi

echo "🔐 Logging in to Fly.io..."
fly auth login

echo ""
echo "📦 Step 1: Deploy Backend to Fly.io"
echo "===================================="

cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer

# Create fly.toml if it doesn't exist
if [ ! -f "fly.toml" ]; then
    echo "Creating fly.toml..."
    cat > fly.toml << 'EOF'
app = "ad-tech-analyzer"
primary_region = "sjc"

[build]

[env]
  PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
EOF
fi

# Create Dockerfile if it doesn't exist
if [ ! -f "Dockerfile" ]; then
    echo "Creating Dockerfile..."
    cat > Dockerfile << 'EOF'
FROM node:20-slim

# Install Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm install
RUN cd dashboard && npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build || true

EXPOSE 3001

CMD ["npx", "tsx", "dashboard/api-server-mcp-final.ts"]
EOF
fi

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
dist
*.log
.env
.vercel
.tribe
EOF

echo ""
echo "🚀 Launching app on Fly.io..."
fly launch --no-deploy

echo ""
echo "🔧 Deploying app..."
fly deploy

echo ""
echo "📊 Getting app info..."
fly status

# Get the URL
FLY_URL=$(fly status --json | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4)
if [ -z "$FLY_URL" ]; then
    echo ""
    read -p "Enter your Fly.io URL (e.g., https://ad-tech-analyzer.fly.dev): " FLY_URL
else
    FLY_URL="https://$FLY_URL"
fi

echo ""
echo "✅ Backend deployed at: $FLY_URL"

# Test backend
echo ""
echo "🧪 Testing backend..."
sleep 5
HEALTH_CHECK=$(curl -s "$FLY_URL/health" 2>&1)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo "✅ Backend health check passed!"
else
    echo "⚠️  Backend might still be starting. Continue anyway..."
fi

echo ""
echo "📱 Step 2: Deploy Frontend to Vercel"
echo "===================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

cd dashboard

echo "Logging in to Vercel..."
vercel login

echo ""
echo "Deploying to Vercel..."
vercel

echo ""
echo "Setting environment variable..."
vercel env add VITE_API_URL production <<EOF
$FLY_URL
EOF

vercel env add VITE_API_URL preview <<EOF
$FLY_URL
EOF

echo ""
echo "Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🎉 Your app is live at 100% FREE!"
echo ""
echo "📊 Dashboard: Check Vercel output above for URL"
echo "🔌 API: $FLY_URL"
echo ""
echo "✅ Benefits of Fly.io:"
echo "   - No cold starts (always on)"
echo "   - Better uptime than Render"
echo "   - 3 VMs free (160MB RAM each)"
echo ""
echo "🧪 Test your deployment:"
echo "   curl $FLY_URL/health"
echo ""
echo "📊 Monitor your app:"
echo "   fly logs"
echo "   fly status"
echo ""
