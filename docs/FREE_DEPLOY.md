# 🆓 100% FREE Deployment Options

## Option 1: Render.com + Vercel (RECOMMENDED) ⭐

**Total Cost:** $0/month
**Limitations:** Backend sleeps after 15 min inactivity (first request takes ~1 min to wake)

### Backend: Render.com (Free Tier)

**Features:**
- ✅ 750 hours/month free
- ✅ Chrome/Chromium pre-installed
- ✅ Long-running processes supported
- ✅ Auto-deploys from GitHub
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ Cold start: ~30-50 seconds

**Deploy Steps:**

1. **Go to https://render.com** and sign up

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `ad-tech-analyzer-api`
     - **Region:** Choose closest to you
     - **Branch:** `main`
     - **Root Directory:** (leave empty)
     - **Runtime:** `Node`
     - **Build Command:** (leave empty)
     - **Start Command:** `npx tsx dashboard/api-server-mcp-final.ts`
     - **Instance Type:** `Free`

3. **Environment Variables:**
   - Add: `PORT` = `3001`

4. **Deploy!**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deploy
   - Copy the URL (e.g., `https://ad-tech-analyzer-api.onrender.com`)

5. **Keep It Awake (Optional):**
   ```bash
   # Use a free cron service to ping every 10 minutes
   # UptimeRobot.com - Free tier: 50 monitors
   # Add URL: https://your-app.onrender.com/health
   # Interval: 5 minutes
   ```

### Frontend: Vercel (Free Tier)

Same as before - see VERCEL_DEPLOY.md

**Estimated setup time:** 10 minutes
**Monthly cost:** $0

---

## Option 2: Fly.io + Vercel (Most Reliable Free Option) ⭐⭐

**Total Cost:** $0/month
**Limitations:** 3 shared-cpu-1x VMs (160MB RAM each) - enough for this app

### Backend: Fly.io (Free Tier)

**Features:**
- ✅ Up to 3 VMs free (160MB RAM each)
- ✅ 3GB persistent storage
- ✅ No sleep time (always on!)
- ✅ Better uptime than Render free
- ✅ Includes Chrome via Docker

**Deploy Steps:**

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create fly.toml:**
   ```bash
   cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer
   ```

   Create `fly.toml`:
   ```toml
   app = "ad-tech-analyzer"
   primary_region = "sjc"

   [build]
     [build.args]
       NODE_VERSION = "20"

   [env]
     PORT = "3001"

   [[services]]
     internal_port = 3001
     protocol = "tcp"

     [[services.ports]]
       handlers = ["http"]
       port = 80

     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443

   [processes]
     web = "npx tsx dashboard/api-server-mcp-final.ts"
   ```

4. **Launch:**
   ```bash
   fly launch
   # Answer prompts:
   # - Use fly.toml? Yes
   # - Create .dockerignore? Yes
   # - Overwrite? Yes
   # - Deploy now? Yes
   ```

5. **Get URL:**
   ```bash
   fly status
   # Copy URL: https://ad-tech-analyzer.fly.dev
   ```

### Frontend: Vercel (Free Tier)

Same as before.

**Estimated setup time:** 15 minutes
**Monthly cost:** $0

---

## Option 3: Glitch + Vercel (Easiest, Requires Keep-Alive)

**Total Cost:** $0/month
**Limitations:** Sleeps after 5 min inactivity, 4000 requests/hour

### Backend: Glitch (Free Tier)

**Features:**
- ✅ Free forever
- ✅ Web-based editor
- ✅ Auto-restarts
- ⚠️ Sleeps after 5 min inactivity
- ⚠️ 4000 requests/hour limit

**Deploy Steps:**

1. **Go to https://glitch.com** and sign up

2. **Create New Project:**
   - Click "New Project" → "Import from GitHub"
   - Enter your repo URL
   - Wait for import

3. **Configure:**
   - Open `.env` file
   - Add: `PORT=3001`

4. **Update package.json start script:**
   ```json
   "scripts": {
     "start": "npx tsx dashboard/api-server-mcp-final.ts"
   }
   ```

5. **Get URL:**
   - Shows at top: `https://your-app.glitch.me`

6. **Keep Alive:**
   - Use UptimeRobot.com to ping every 5 minutes

### Frontend: Vercel (Free Tier)

Same as before.

**Estimated setup time:** 5 minutes
**Monthly cost:** $0

---

## Option 4: Self-Host + Cloudflare Tunnel (100% Free, Best Performance) ⭐⭐⭐

**Total Cost:** $0/month
**Limitations:** Requires your computer to be running

### Backend: Your Computer + Cloudflare Tunnel

**Features:**
- ✅ 100% free
- ✅ No cold starts
- ✅ Unlimited requests
- ✅ Full control
- ⚠️ Computer must be running

**Deploy Steps:**

1. **Install Cloudflare Tunnel:**
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared

   # Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   sudo chmod +x /usr/local/bin/cloudflared
   ```

2. **Login:**
   ```bash
   cloudflared tunnel login
   ```

3. **Create Tunnel:**
   ```bash
   cloudflared tunnel create ad-tech-api
   ```

4. **Configure tunnel.yml:**
   ```yaml
   tunnel: <TUNNEL-ID>
   credentials-file: /Users/Dikshant/.cloudflared/<TUNNEL-ID>.json

   ingress:
     - hostname: ad-tech-api.yourdomain.com
       service: http://localhost:3001
     - service: http_status:404
   ```

5. **Start API server:**
   ```bash
   npx tsx dashboard/api-server-mcp-final.ts &
   ```

6. **Run tunnel:**
   ```bash
   cloudflared tunnel run ad-tech-api
   ```

7. **Get URL:**
   - Shows in terminal: `https://random-subdomain.trycloudflare.com`
   - Or set up custom domain for free

### Frontend: Vercel (Free Tier)

Same as before.

**Estimated setup time:** 10 minutes
**Monthly cost:** $0

---

## Option 5: Koyeb + Vercel (New, Free Tier)

**Total Cost:** $0/month
**Limitations:** 1 web service free

### Backend: Koyeb (Free Tier)

**Features:**
- ✅ 1 web service free
- ✅ No credit card required
- ✅ Auto-scaling
- ✅ Global edge network

**Deploy Steps:**

1. **Go to https://koyeb.com** and sign up

2. **Create App:**
   - Click "Create App"
   - Choose "GitHub"
   - Select repository
   - Configure:
     - **Name:** `ad-tech-analyzer-api`
     - **Build command:** (leave empty)
     - **Run command:** `npx tsx dashboard/api-server-mcp-final.ts`
     - **Port:** `3001`
     - **Instance:** `Free`

3. **Deploy:**
   - Click "Deploy"
   - Copy URL: `https://ad-tech-analyzer-api-yourorg.koyeb.app`

### Frontend: Vercel (Free Tier)

Same as before.

**Estimated setup time:** 8 minutes
**Monthly cost:** $0

---

## Comparison Table

| Option | Setup Time | Cold Start | Uptime | Best For |
|--------|-----------|------------|--------|----------|
| **Render + Vercel** | 10 min | 30-50s | 99% | Simple, GitHub-based |
| **Fly.io + Vercel** | 15 min | None | 99.9% | Best reliability |
| **Glitch + Vercel** | 5 min | 10-20s | 95% | Quickest setup |
| **Self-host + Tunnel** | 10 min | None | 100%* | Best performance |
| **Koyeb + Vercel** | 8 min | 20-30s | 99% | Modern platform |

*When your computer is running

---

## My Recommendation

**For Production:** Fly.io + Vercel
- No cold starts
- Better uptime
- More reliable

**For Quick Test:** Render.com + Vercel
- Easiest setup
- GitHub auto-deploy
- Good enough for demos

**For Best Performance:** Self-host + Cloudflare Tunnel
- Zero latency
- Unlimited resources
- 100% free forever

---

## Handling Cold Starts (Render/Glitch)

### Method 1: UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Add New Monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://your-backend-url.onrender.com/health`
   - **Interval:** 5 minutes
3. Free tier: 50 monitors, 5-min checks

### Method 2: Cron-Job.org (Free)

1. Go to https://cron-job.org
2. Create job:
   - **URL:** `https://your-backend-url/health`
   - **Interval:** Every 10 minutes
3. Free tier: Unlimited jobs

### Method 3: GitHub Actions (Free)

Create `.github/workflows/keep-alive.yml`:
```yaml
name: Keep Backend Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend
        run: curl https://your-backend-url.onrender.com/health
```

---

## Quick Deploy Scripts

I'll create automated scripts for each free option.

Which free option would you like me to set up?
1. Render.com (easiest)
2. Fly.io (most reliable)
3. Self-host + Cloudflare (best performance)
