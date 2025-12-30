#!/bin/bash

echo "🚀 Ad Tech Analyzer - Deployment Script"
echo "========================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it:"
    echo "   npm install -g vercel"
    exit 1
fi

echo "✅ Prerequisites installed"
echo ""

# Deploy Backend to Railway
echo "📦 Step 1: Deploy Backend to Railway"
echo "------------------------------------"
railway login
railway init
railway up

echo ""
echo "🔗 Get your Railway URL:"
railway status
echo ""
read -p "Enter your Railway URL (e.g., https://ad-tech-api.up.railway.app): " RAILWAY_URL

echo ""
echo "📱 Step 2: Deploy Frontend to Vercel"
echo "------------------------------------"
cd dashboard
vercel login
vercel

echo ""
echo "🔧 Step 3: Set Environment Variable"
vercel env add VITE_API_URL production
echo "$RAILWAY_URL"
vercel env add VITE_API_URL preview
echo "$RAILWAY_URL"

echo ""
echo "🎯 Step 4: Deploy to Production"
vercel --prod

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📊 Dashboard: Check Vercel output for URL"
echo "🔌 API: $RAILWAY_URL"
echo ""
echo "🧪 Test your deployment:"
echo "   curl $RAILWAY_URL/health"
echo ""
