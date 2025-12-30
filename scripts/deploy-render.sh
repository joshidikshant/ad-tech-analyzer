#!/bin/bash

echo "🆓 Deploy to Render.com (FREE) + Vercel (FREE)"
echo "=============================================="
echo ""
echo "📋 Prerequisites:"
echo "   1. GitHub account"
echo "   2. Push your code to GitHub first"
echo ""
read -p "Have you pushed to GitHub? (y/n): " PUSHED

if [ "$PUSHED" != "y" ]; then
    echo "❌ Please push to GitHub first:"
    echo "   git add ."
    echo "   git commit -m 'Ready for deployment'"
    echo "   git push origin main"
    exit 1
fi

echo ""
echo "📦 Step 1: Deploy Backend to Render.com"
echo "========================================"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to https://render.com and sign up/login"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure:"
echo "   - Name: ad-tech-analyzer-api"
echo "   - Runtime: Node"
echo "   - Build Command: (leave empty)"
echo "   - Start Command: npx tsx dashboard/api-server-mcp-final.ts"
echo "   - Instance Type: Free"
echo "5. Add Environment Variable:"
echo "   - PORT = 3001"
echo "6. Click 'Create Web Service'"
echo "7. Wait 5-10 minutes for deploy to complete"
echo ""
read -p "Press Enter when backend is deployed..."

echo ""
read -p "Enter your Render.com URL (e.g., https://ad-tech-api.onrender.com): " RENDER_URL

echo ""
echo "✅ Backend deployed at: $RENDER_URL"
echo ""

# Test backend
echo "🧪 Testing backend..."
HEALTH_CHECK=$(curl -s "$RENDER_URL/health" 2>&1)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo "✅ Backend health check passed!"
else
    echo "⚠️  Backend might still be deploying. Continue anyway..."
fi

echo ""
echo "📱 Step 2: Deploy Frontend to Vercel"
echo "===================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

cd dashboard

# Login to Vercel
echo "Logging in to Vercel..."
vercel login

echo ""
echo "Deploying to Vercel..."
vercel

echo ""
echo "Setting environment variable..."
vercel env add VITE_API_URL production <<EOF
$RENDER_URL
EOF

vercel env add VITE_API_URL preview <<EOF
$RENDER_URL
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
echo "🔌 API: $RENDER_URL"
echo ""
echo "⚠️  NOTE: Render free tier sleeps after 15 min inactivity"
echo "    First request after sleep will take ~30-50 seconds"
echo ""
echo "💡 To keep it awake:"
echo "    1. Go to https://uptimerobot.com"
echo "    2. Add monitor for: $RENDER_URL/health"
echo "    3. Set interval: 5 minutes"
echo ""
echo "🧪 Test your deployment:"
echo "   curl $RENDER_URL/health"
echo ""
