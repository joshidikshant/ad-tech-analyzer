# 🚀 Quick Deploy to Vercel + Railway

## TL;DR - Deploy in 5 Minutes

```bash
# 1. Install CLIs
npm install -g @railway/cli vercel

# 2. Run automated deployment script
./deploy.sh

# Done! Your app is live 🎉
```

---

## Manual Deployment Steps

### Step 1: Deploy Backend to Railway (2 minutes)

Railway supports long-running Node.js processes needed for MCP.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

**Get your Railway URL:**
```bash
railway status
```
Copy the URL (e.g., `https://ad-tech-api-production.up.railway.app`)

---

### Step 2: Deploy Frontend to Vercel (2 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Go to dashboard directory
cd dashboard

# Login
vercel login

# Deploy (follow prompts)
vercel

# Set API URL environment variable
vercel env add VITE_API_URL production
# Paste your Railway URL from Step 1

# Also set for preview deployments
vercel env add VITE_API_URL preview
# Paste same Railway URL

# Deploy to production
vercel --prod
```

Done! Your Vercel URL will be shown (e.g., `https://ad-tech-analyzer.vercel.app`)

---

### Step 3: Test Deployment (30 seconds)

**Test Backend:**
```bash
curl https://your-railway-url.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Test Frontend:**
1. Open your Vercel URL
2. Click "Load Sample" - should show Carscoops.com data
3. Enter `https://www.geeksforgeeks.org/` and click "Analyze"
4. Wait ~30 seconds
5. Should show 18+ vendors detected ✅

---

## Alternative: Deploy via Web UIs

### Backend (Railway)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select your repo
4. Set Start Command: `npx tsx dashboard/api-server-mcp-final.ts`
5. Add Environment Variable: `PORT=3001`
6. Deploy ✅

### Frontend (Vercel)

1. Go to https://vercel.com
2. Add New Project → Import Git Repository
3. Select your repo
4. Set Root Directory: `dashboard`
5. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-railway-url.railway.app`
6. Deploy ✅

---

## What Got Deployed?

### Frontend (Vercel)
- ✅ Static Vite build
- ✅ Environment variable configured
- ✅ Auto-deploys on git push
- ✅ Free tier (100GB bandwidth)
- ✅ Global CDN

### Backend (Railway)
- ✅ Node.js + TypeScript
- ✅ MCP subprocess support
- ✅ Chrome/Chromium available
- ✅ Auto-deploys on git push
- ✅ $5/month (512MB RAM)

---

## Troubleshooting

### "Failed to fetch" Error in Dashboard
**Problem:** CORS or API URL misconfigured
**Fix:**
```bash
# Verify environment variable
vercel env ls

# Update if needed
vercel env rm VITE_API_URL production
vercel env add VITE_API_URL production
# Enter correct Railway URL

# Redeploy
vercel --prod
```

### Backend Health Check Fails
**Problem:** Railway deployment failed
**Fix:**
```bash
# Check Railway logs
railway logs

# Common issues:
# - TypeScript build error → Check `npm run build` locally
# - Port binding error → Set PORT env var to 3001
# - Chrome not found → Railway should include it by default
```

### Analysis Times Out
**Problem:** 30-second timeout too short
**Fix:** Update timeout in `dashboard/src/App.tsx`:
```typescript
body: JSON.stringify({ url, device, timeout: 60000 }) // 60 seconds
```
Rebuild and redeploy:
```bash
cd dashboard
npm run build
vercel --prod
```

---

## Updating After Deployment

```bash
# Make your changes locally

# Push to git
git add .
git commit -m "Update feature X"
git push

# Auto-deploys to:
# - Railway (backend)
# - Vercel (frontend, all branches)
```

**Manual redeploy:**
```bash
# Backend
railway up

# Frontend
cd dashboard
vercel --prod
```

---

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Vercel (Frontend) | Hobby | Free |
| Railway (Backend) | Starter | $5/month |
| **Total** | | **$5/month** |

**Includes:**
- Unlimited frontend requests
- 500 hours backend uptime
- Auto-scaling
- SSL certificates
- Global CDN

---

## Custom Domain (Optional)

### Frontend (Vercel)
```bash
vercel domains add your-domain.com
# Follow DNS instructions
```

### Backend (Railway)
```bash
railway domain
# Follow instructions to add custom domain
```

---

## Monitoring

### Backend Logs (Railway)
```bash
railway logs
railway logs --follow
```

### Frontend Logs (Vercel)
```bash
vercel logs
vercel logs --follow
```

**Web UIs:**
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Test both deployments
4. 🎯 Share your live URL!
5. 📊 Monitor usage and performance
6. 🔧 Iterate and improve

**Your app is live!** 🚀

Dashboard: `https://your-app.vercel.app`
API: `https://your-api.railway.app`
