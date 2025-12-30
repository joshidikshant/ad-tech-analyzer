# 🚀 Choose Your FREE Deployment

All options below are **100% FREE** - no credit card required!

## Quick Comparison

| Option | Setup Time | Cold Start | Always On | Best For |
|--------|-----------|------------|-----------|----------|
| 🥇 **Fly.io** | 15 min | ❌ None | ✅ Yes | Production |
| 🥈 **Render** | 10 min | ⚠️ 30-50s | ⚠️ Sleeps | Quick demos |
| 🥉 **Self-Host** | 10 min | ❌ None | ✅ Yes | Best performance |

## Choose Your Deployment:

### Option 1: Fly.io + Vercel (Most Reliable) ⭐⭐⭐

**Perfect for:** Production use, no downtime tolerance

```bash
./deploy-flyio.sh
```

**Features:**
- ✅ No cold starts (always on)
- ✅ 3 free VMs (160MB RAM each)
- ✅ Best uptime (99.9%)
- ✅ Auto-deploys from GitHub
- ✅ Global edge network
- ✅ Includes Chrome/Chromium

**Monthly Cost:** $0 (free tier)
**Setup Time:** 15 minutes

---

### Option 2: Render.com + Vercel (Easiest) ⭐⭐

**Perfect for:** Demos, portfolios, testing

```bash
./deploy-render.sh
```

**Features:**
- ✅ Easiest setup (mostly web UI)
- ✅ 750 hours/month free
- ✅ Auto-deploys from GitHub
- ✅ Chrome pre-installed
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ First request takes 30-50s to wake
- 💡 Use UptimeRobot to keep awake (free)

**Monthly Cost:** $0 (free tier)
**Setup Time:** 10 minutes

---

### Option 3: Self-Host + Cloudflare Tunnel (Best Performance) ⭐⭐⭐

**Perfect for:** Development, unlimited resources, full control

```bash
./deploy-selfhost.sh
```

**Features:**
- ✅ Zero cold starts
- ✅ Unlimited requests
- ✅ Best performance (local Chrome)
- ✅ 100% free forever
- ✅ Full control over environment
- ⚠️ Computer must be running
- 💡 Can run on old laptop/Raspberry Pi

**Monthly Cost:** $0 (completely free)
**Setup Time:** 10 minutes

---

## My Recommendation

**Just Starting Out?** → **Render.com**
- Easiest setup
- Web UI for everything
- Great for demos and portfolios

**Want Production Quality?** → **Fly.io**
- No cold starts
- Best reliability
- Auto-scaling
- Better for real users

**Have Extra Computer?** → **Self-Host**
- Best performance
- No limitations
- Zero cost forever

---

## What Each Script Does

All deployment scripts will:

1. ✅ **Deploy Backend** (API server with MCP)
   - Chrome DevTools MCP integration
   - Ad-tech analysis engine
   - Health check endpoint

2. ✅ **Deploy Frontend** to Vercel
   - React dashboard
   - Interactive visualizations
   - Responsive design

3. ✅ **Configure Everything**
   - Environment variables
   - CORS settings
   - API endpoints

4. ✅ **Test Deployment**
   - Health check
   - Sample data
   - Full analysis

5. 🎉 **Give You Live URLs**
   - Dashboard URL
   - API URL
   - Monitoring commands

---

## After Deployment

### Monitor Your App

**Fly.io:**
```bash
fly logs          # View logs
fly status        # Check status
fly dashboard     # Web dashboard
```

**Render:**
- Go to https://render.com/dashboard
- View logs in web UI
- Monitor metrics

**Self-Host:**
```bash
tail -f /tmp/api-server-selfhost.log      # API logs
tail -f /tmp/cloudflare-tunnel.log        # Tunnel logs
```

### Keep It Awake (Render Only)

Use UptimeRobot (free) to ping every 10 minutes:

1. Go to https://uptimerobot.com
2. Add New Monitor
3. URL: `https://your-app.onrender.com/health`
4. Interval: 5 minutes

---

## Troubleshooting

### "Failed to fetch" in Dashboard
**Fix:**
```bash
# Check backend is running
curl https://your-backend-url/health

# Verify Vercel env variable
cd dashboard
vercel env ls

# Update if needed
vercel env rm VITE_API_URL production
vercel env add VITE_API_URL production
# Enter your backend URL
vercel --prod
```

### Analysis Times Out
**Fix:** Backend probably sleeping (Render)
- Wait 30-50 seconds for wake up
- Or set up UptimeRobot to keep awake

### Chrome Not Found
**Fix:**
- Fly.io: Rebuild with Dockerfile
- Render: Should work automatically
- Self-host: Install Chrome locally

---

## Updating Your Deployment

### Code Changes

**Fly.io:**
```bash
fly deploy
```

**Render:**
- Push to GitHub
- Auto-deploys automatically

**Self-Host:**
```bash
# Restart services
kill <API_PID>
npx tsx dashboard/api-server-mcp-final.ts &
```

**Vercel (Frontend):**
```bash
cd dashboard
vercel --prod
```

---

## Cost Summary

| Component | Service | Free Tier | Limit |
|-----------|---------|-----------|-------|
| **Frontend** | Vercel | Free | 100GB/month |
| **Backend (Fly.io)** | Fly.io | Free | 3 VMs, 160MB each |
| **Backend (Render)** | Render | Free | 750 hours/month |
| **Backend (Self-host)** | None | Free | Unlimited |
| **Total** | | **$0/month** | No credit card needed |

---

## Ready to Deploy?

**Choose your deployment option above and run the script!**

Need help? See:
- `FREE_DEPLOY.md` - Detailed guide for all options
- `VERCEL_DEPLOY.md` - Original Vercel guide
- Or ask me! 😊

**Deployment time:** 10-15 minutes
**Total cost:** $0 forever
