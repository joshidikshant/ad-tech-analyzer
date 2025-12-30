#!/bin/bash

echo "🏠 Self-Host + Cloudflare Tunnel (100% FREE)"
echo "============================================"
echo ""
echo "✅ Benefits:"
echo "   - 100% free forever"
echo "   - No cold starts"
echo "   - Unlimited requests"
echo "   - Best performance"
echo ""
echo "⚠️  Requirements:"
echo "   - Your computer must be running"
echo "   - Cloudflare account (free)"
echo ""
read -p "Continue? (y/n): " CONTINUE

if [ "$CONTINUE" != "y" ]; then
    exit 0
fi

echo ""
echo "📦 Step 1: Install Cloudflare Tunnel"
echo "===================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflare/cloudflare/cloudflared
    else
        # Linux
        wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
        sudo chmod +x /usr/local/bin/cloudflared
    fi
fi

echo ""
echo "✅ Cloudflared installed"

echo ""
echo "🔐 Step 2: Login to Cloudflare"
echo "==============================="
cloudflared tunnel login

echo ""
echo "🚇 Step 3: Create Tunnel"
echo "========================"
TUNNEL_NAME="ad-tech-api-$(date +%s)"
cloudflared tunnel create "$TUNNEL_NAME"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Failed to create tunnel"
    exit 1
fi

echo "✅ Tunnel created: $TUNNEL_ID"

echo ""
echo "📝 Step 4: Configure Tunnel"
echo "==========================="

# Create config directory
mkdir -p ~/.cloudflared

# Create config file
cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - service: http://localhost:3001
EOF

echo "✅ Tunnel configured"

echo ""
echo "🚀 Step 5: Start Services"
echo "========================="

cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer

# Start API server in background
echo "Starting API server..."
npx tsx dashboard/api-server-mcp-final.ts > /tmp/api-server-selfhost.log 2>&1 &
API_PID=$!
echo "API server started (PID: $API_PID)"

# Wait for API to be ready
echo "Waiting for API server to start..."
sleep 5

# Check if API is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server failed to start. Check /tmp/api-server-selfhost.log"
    exit 1
fi

echo ""
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run "$TUNNEL_NAME" > /tmp/cloudflare-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Cloudflare tunnel started (PID: $TUNNEL_PID)"

# Wait for tunnel to start
sleep 5

# Get tunnel URL from logs
TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Couldn't find tunnel URL automatically"
    echo "Please check the logs at /tmp/cloudflare-tunnel.log"
    read -p "Enter your tunnel URL: " TUNNEL_URL
fi

echo ""
echo "✅ Tunnel URL: $TUNNEL_URL"

# Test backend through tunnel
echo ""
echo "🧪 Testing backend through tunnel..."
sleep 3
HEALTH_CHECK=$(curl -s "$TUNNEL_URL/health" 2>&1)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo "✅ Backend accessible through tunnel!"
else
    echo "⚠️  Backend might still be starting..."
fi

echo ""
echo "📱 Step 6: Deploy Frontend to Vercel"
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
$TUNNEL_URL
EOF

vercel env add VITE_API_URL preview <<EOF
$TUNNEL_URL
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
echo "🔌 API: $TUNNEL_URL"
echo ""
echo "📝 Background Processes:"
echo "   - API Server PID: $API_PID"
echo "   - Cloudflare Tunnel PID: $TUNNEL_PID"
echo ""
echo "📊 Logs:"
echo "   - API: /tmp/api-server-selfhost.log"
echo "   - Tunnel: /tmp/cloudflare-tunnel.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $API_PID $TUNNEL_PID"
echo ""
echo "🔄 To restart (keep same tunnel URL):"
echo "   npx tsx dashboard/api-server-mcp-final.ts &"
echo "   cloudflared tunnel run $TUNNEL_NAME &"
echo ""
echo "💡 To run on startup (macOS):"
echo "   1. Create LaunchAgent plist file"
echo "   2. Or use pm2: npm install -g pm2"
echo "      pm2 start 'npx tsx dashboard/api-server-mcp-final.ts' --name ad-tech-api"
echo "      pm2 start 'cloudflared tunnel run $TUNNEL_NAME' --name cloudflare-tunnel"
echo "      pm2 startup"
echo "      pm2 save"
echo ""
echo "🧪 Test your deployment:"
echo "   curl $TUNNEL_URL/health"
echo ""
