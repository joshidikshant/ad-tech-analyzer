# Deployment Guide - Ad Tech Analyzer

## Architecture

The application has two parts:
1. **Frontend (Dashboard)** - React + Vite app → Deploy to Vercel
2. **Backend (API Server)** - Node.js + MCP → Deploy to Railway/Render/Fly.io

---

## Option 1: Deploy to Vercel + Railway (Recommended)

### Step 1: Deploy Backend to Railway

Railway supports long-running processes and subprocess spawning needed for MCP.

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Create Railway project and deploy API:**
   ```bash
   cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer

   # Initialize Railway project
   railway init

   # Create Procfile for Railway
   echo "web: npx tsx dashboard/api-server-mcp-final.ts" > Procfile

   # Deploy
   railway up
   ```

4. **Set environment variables in Railway:**
   ```bash
   railway variables set PORT=3001
   ```

5. **Get your Railway URL:**
   ```bash
   railway status
   # Copy the domain (e.g., https://ad-tech-api-production.up.railway.app)
   ```

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy dashboard:**
   ```bash
   cd dashboard

   # Deploy to Vercel
   vercel

   # Follow prompts:
   # - Set up and deploy? Yes
   # - Which scope? (choose your account)
   # - Link to existing project? No
   # - Project name? ad-tech-analyzer-dashboard
   # - Directory? ./
   # - Override settings? No
   ```

4. **Set environment variable in Vercel:**
   ```bash
   # Replace with your Railway URL from Step 1
   vercel env add VITE_API_URL production
   # Enter value: https://ad-tech-api-production.up.railway.app

   # Also set for preview deployments
   vercel env add VITE_API_URL preview
   # Enter same value
   ```

5. **Redeploy to apply environment variables:**
   ```bash
   vercel --prod
   ```

### Step 3: Enable CORS on Backend

Update `dashboard/api-server-mcp-final.ts` to allow your Vercel domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ad-tech-analyzer-dashboard.vercel.app', // Replace with your Vercel domain
    /\.vercel\.app$/ // Allow all Vercel preview deployments
  ]
}));
```

Redeploy to Railway:
```bash
railway up
```

---

## Option 2: Deploy via Vercel Web UI

### Backend (Railway):

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub repository
4. Set:
   - **Root Directory:** `/`
   - **Build Command:** (leave empty)
   - **Start Command:** `npx tsx dashboard/api-server-mcp-final.ts`
   - **Environment Variables:**
     - `PORT=3001`
5. Deploy and copy the generated URL

### Frontend (Vercel):

1. Go to https://vercel.com
2. Click "Add New Project" → Import Git Repository
3. Select your repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `dashboard`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     - `VITE_API_URL` = `https://your-railway-url.railway.app`
5. Deploy

---

## Option 3: Alternative Backend Hosts

### Render.com
```bash
# Render auto-detects Node.js apps
# Set Start Command: npx tsx dashboard/api-server-mcp-final.ts
# Set Environment: PORT=3001
```

### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Initialize Fly app
fly launch

# Deploy
fly deploy
```

---

## Verify Deployment

1. **Test Backend:**
   ```bash
   curl https://your-backend-url.railway.app/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Test Frontend:**
   - Visit your Vercel URL
   - Click "Load Sample" button
   - Enter a test URL like `https://www.geeksforgeeks.org/`
   - Click "Analyze"

---

## Environment Variables Summary

### Backend (Railway/Render/Fly.io)
- `PORT` - Port to listen on (default: 3001)

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL (e.g., `https://ad-tech-api.railway.app`)

---

## Troubleshooting

### CORS Errors
Make sure backend CORS settings allow your Vercel domain:
```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app'
  ]
}));
```

### API Timeout
Increase timeout in `App.tsx` if needed:
```typescript
body: JSON.stringify({ url, device, timeout: 60000 }) // 60 seconds
```

### Chrome/Chromium Not Found
Railway/Render should have Chromium available. If not, add buildpack:
```bash
# Railway: Add to Nixpacks config
# Render: Add to render.yaml
```

---

## Cost Estimate

- **Vercel (Frontend):** Free tier (100GB bandwidth/month)
- **Railway (Backend):** $5/month (512MB RAM, 500 hours)
- **Total:** ~$5/month

---

## Production Checklist

- [ ] Backend deployed and `/health` endpoint working
- [ ] Frontend environment variable `VITE_API_URL` set
- [ ] CORS configured to allow Vercel domain
- [ ] Sample data loading correctly
- [ ] Test analysis on multiple sites
- [ ] Monitor Railway logs for errors
- [ ] Set up custom domain (optional)

---

## Quick Deploy Commands

```bash
# Backend (Railway)
railway init
railway up

# Frontend (Vercel)
cd dashboard
vercel env add VITE_API_URL production
vercel --prod
```

Done! Your dashboard is live at `https://your-app.vercel.app` 🚀
