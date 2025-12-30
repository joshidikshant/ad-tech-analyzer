# 🎯 Deploy Everything on Render.com (100% FREE)

**The Simplest Deployment** - One platform for everything!

---

## Why Render-Only?

**Simpler:**
- ✅ Single platform (no juggling Vercel + backend)
- ✅ One dashboard to monitor everything
- ✅ Easier to manage

**100% Free:**
- ✅ Backend: Render Web Service (FREE)
- ✅ Frontend: Render Static Site (FREE)
- ✅ No credit card required
- ✅ Commercial use allowed

**Features:**
- ✅ Auto-deploys from GitHub
- ✅ Global CDN for frontend
- ✅ Custom domains supported
- ✅ Free SSL certificates
- ✅ 100GB bandwidth/month
- ✅ 500 build minutes/month

---

## Quick Deploy

### Automated Script (Recommended)

```bash
./deploy-render-only.sh
```

Walks you through:
1. Backend deployment (5-10 min)
2. Frontend deployment (3-5 min)
3. Configuration
4. Testing

**Total time:** 15 minutes
**Total cost:** $0

---

## Manual Deployment

### Prerequisites

1. **Push code to GitHub:**
   ```bash
   cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/ad-tech-analyzer.git
   git push -u origin main
   ```

2. **Sign up at https://render.com** (free, no credit card)

---

### Step 1: Deploy Backend (Web Service)

1. **In Render Dashboard:**
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Choose your GitHub repository
   - Click **"Connect"**

3. **Configure:**
   ```
   Name:           ad-tech-analyzer-api
   Region:         Oregon (or closest to you)
   Branch:         main
   Root Directory: (leave empty)
   Runtime:        Node
   Build Command:  (leave empty)
   Start Command:  npx tsx dashboard/api-server-mcp-final.ts
   Instance Type:  Free
   ```

4. **Environment Variables:**
   - Click **"Advanced"**
   - Add variable:
     ```
     Key:   PORT
     Value: 3001
     ```

5. **Deploy:**
   - Click **"Create Web Service"**
   - Wait 5-10 minutes for first deploy
   - Copy your URL (e.g., `https://ad-tech-analyzer-api.onrender.com`)

6. **Test:**
   ```bash
   curl https://ad-tech-analyzer-api.onrender.com/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

---

### Step 2: Deploy Frontend (Static Site)

1. **In Render Dashboard:**
   - Click **"New +"** → **"Static Site"**

2. **Connect Repository:**
   - Choose the SAME GitHub repository
   - Click **"Connect"**

3. **Configure:**
   ```
   Name:           ad-tech-analyzer-dashboard
   Branch:         main
   Root Directory: dashboard
   Build Command:  npm install && npm run build
   Publish Dir:    dist
   ```

4. **Environment Variables:**
   - Click **"Advanced"**
   - Add variable:
     ```
     Key:   VITE_API_URL
     Value: https://ad-tech-analyzer-api.onrender.com
     ```
     (Use your actual backend URL from Step 1)

5. **Deploy:**
   - Click **"Create Static Site"**
   - Wait 3-5 minutes for build
   - Copy your URL (e.g., `https://ad-tech-analyzer-dashboard.onrender.com`)

6. **Test:**
   - Open your frontend URL in browser
   - Click **"Load Sample"** button
   - Should show Carscoops.com data ✅

---

### Step 3: Keep Backend Awake (Optional but Recommended)

Render free tier sleeps after 15 minutes of inactivity. Keep it awake:

**Using UptimeRobot (Free):**

1. Go to https://uptimerobot.com
2. Sign up (free)
3. **Add New Monitor:**
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Ad Tech Analyzer Backend
   URL: https://ad-tech-analyzer-api.onrender.com/health
   Monitoring Interval: 5 minutes
   ```
4. Save

**Result:** Backend stays awake, no cold starts!

---

## Architecture

```
┌─────────────────────────────────────┐
│         Render.com (FREE)           │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Static Site (Frontend)      │  │
│  │  - React Dashboard           │  │
│  │  - Global CDN                │  │
│  │  - Auto-deploy from GitHub   │  │
│  └──────────┬───────────────────┘  │
│             │ API calls            │
│             ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Web Service (Backend)       │  │
│  │  - Node.js + MCP             │  │
│  │  - Chrome DevTools           │  │
│  │  - Auto-deploy from GitHub   │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**One platform. Zero cost. Simple!**

---

## What You Get

### Backend (Web Service)
- ✅ Node.js 20 runtime
- ✅ Chrome/Chromium pre-installed
- ✅ MCP subprocess support
- ✅ Health check endpoint
- ✅ Auto-restart on crashes
- ✅ HTTPS with free SSL
- ⚠️ Sleeps after 15 min (use UptimeRobot)

### Frontend (Static Site)
- ✅ Vite build optimization
- ✅ Global CDN (fast worldwide)
- ✅ Automatic compression (Brotli)
- ✅ HTTP/2 support
- ✅ Free SSL certificate
- ✅ Custom domain support
- ✅ Always on (no sleep)

---

## Free Tier Limits

| Resource | Limit | Your Usage (Est.) |
|----------|-------|-------------------|
| **Bandwidth** | 100GB/month | ~5-10GB (low) |
| **Build Minutes** | 500/month | ~10-20 min (low) |
| **Web Services** | Unlimited | 1 |
| **Static Sites** | Unlimited | 1 |
| **Custom Domains** | 2 per workspace | 0-2 |

**You're well within limits!** ✅

---

## Auto-Deployment

Both services auto-deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature X"
git push

# Render automatically:
# 1. Detects push
# 2. Builds backend & frontend
# 3. Deploys both
# 4. Your app updates in ~5 minutes
```

**No manual deploys needed!**

---

## Custom Domains (Optional)

Want your own domain? Render supports it for free!

### Add Custom Domain

1. **Buy domain** (Namecheap, GoDaddy, etc.)

2. **In Render Dashboard:**
   - Go to your Static Site
   - Click **"Custom Domain"**
   - Enter: `www.yourdomain.com`
   - Follow DNS instructions

3. **Update DNS** at your registrar:
   ```
   Type: CNAME
   Name: www
   Value: <your-app>.onrender.com
   ```

4. **Wait 5-60 minutes** for DNS propagation

**Result:** Your app at `www.yourdomain.com` ✅

---

## Monitoring & Logs

### View Logs

**Backend:**
- Go to https://dashboard.render.com
- Click your Web Service
- Click **"Logs"** tab
- Live stream of all requests

**Frontend:**
- Static sites don't have runtime logs
- Check build logs during deployment

### Metrics

**In Dashboard:**
- Request count
- Bandwidth usage
- Build minutes used
- Deployment history

---

## Troubleshooting

### Backend Sleeps After 15 Minutes
**Solution:** Set up UptimeRobot (see Step 3 above)

### CORS Errors
**Check:** Backend CORS already configured for `*.onrender.com`

If still issues:
```typescript
// In dashboard/api-server-mcp-final.ts
app.use(cors({
  origin: [
    'http://localhost:5173',
    /\.onrender\.com$/,  // Should work!
    'https://your-custom-domain.com'  // Add if using custom domain
  ]
}));
```

Commit and push to redeploy.

### Build Fails
**Check build logs** in Render dashboard

Common issues:
- Missing dependencies → Check `package.json`
- TypeScript errors → Run `npm run build` locally first
- Wrong Node version → Render uses Node 20 by default

### Frontend Shows Old Version
**Clear cache:**
- Render dashboard → Static Site → Manual Deploy → "Clear build cache & deploy"

---

## Cost Comparison

| Platform | Setup | Monthly Cost | Features |
|----------|-------|--------------|----------|
| **Render Only** | 1 platform | $0 | ⭐ Simplest |
| Vercel + Render | 2 platforms | $0 | More complex |
| Vercel + Railway | 2 platforms | $5 | Not free! |

**Winner:** Render-only! ✅

---

## Ready to Deploy?

### Quick Start

```bash
./deploy-render-only.sh
```

### Or Manual Steps

1. Push code to GitHub
2. Sign up at render.com
3. Deploy backend (Web Service)
4. Deploy frontend (Static Site)
5. Set up UptimeRobot
6. Done! ✅

**Time:** 15 minutes
**Cost:** $0 forever
**Platforms:** 1 (Render only)

---

## After Deployment

**Your live URLs:**
- 📊 Dashboard: `https://ad-tech-analyzer-dashboard.onrender.com`
- 🔌 API: `https://ad-tech-analyzer-api.onrender.com`

**Test it:**
1. Open dashboard
2. Click "Load Sample"
3. Or analyze any site!

**Monitor:**
- https://dashboard.render.com

**Update:**
- Just push to GitHub
- Auto-deploys in ~5 minutes

---

## Summary

✅ **One platform** (Render.com)
✅ **Zero cost** (100% free)
✅ **Zero complexity** (simpler than multi-platform)
✅ **Auto-deploys** from GitHub
✅ **Production-ready** with SSL, CDN, etc.

**This is the easiest way to deploy your ad-tech analyzer!** 🚀

Ready? Run `./deploy-render-only.sh` or follow the manual steps above!
