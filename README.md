# 🔍 Ad Tech Analyzer

> Reverse engineer advertising technology stacks on any website with beautiful visualizations.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

**Live Demo:** [Coming Soon]

---

## ✨ Features

- 🔍 **Comprehensive Analysis** - Detects 30+ ad-tech vendors including SSPs, ad servers, header bidding
- 📊 **Beautiful Dashboard** - Interactive charts, metrics, and vendor breakdowns
- 🚀 **Fast** - 30-second average analysis time
- 🎯 **Accurate** - Detects Prebid.js, GAM, managed services, identity solutions
- 🆓 **Free to Deploy** - 100% free hosting on Render.com
- 🔐 **Privacy-Focused** - Headless analysis, no data stored

---

## 🎯 What It Detects

### Ad Servers
- Google Ad Manager (GAM)
- Smart AdServer
- OpenX Ad Server

### Header Bidding
- Prebid.js (config, bidders, responses)
- Amazon APS
- Index Wrapper

### Supply-Side Platforms (SSPs)
- Criteo, PubMatic, Rubicon
- AppNexus, Index Exchange
- TripleLift, Media.net
- Sovrn, Teads, Sharethrough
- And 15+ more...

### Managed Services
- AdPushup, Freestar, Raptive
- Mediavine, Ezoic, PubGalaxy
- Adapex, PubGuru, Vuukle

### Identity Solutions
- The Trade Desk UID2
- ID5, LiveRamp
- Criteo ID, Unified ID

### Consent Management
- OneTrust, Quantcast
- Cookiebot, TrustArc

---

## 🚀 Quick Start

### Option 1: Deploy to Render.com (Recommended)

**100% free hosting:**

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/ad-tech-analyzer.git
cd ad-tech-analyzer

# Run deployment script
./deploy-render-only.sh
```

Follow the prompts - your app will be live in 15 minutes!

See [RENDER_ONLY.md](RENDER_ONLY.md) for detailed instructions.

---

### Option 2: Run Locally

**Prerequisites:**
- Node.js 20+
- Chrome/Chromium

**Installation:**

```bash
# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Start backend
npx tsx dashboard/api-server-mcp-final.ts

# Start frontend (in new terminal)
cd dashboard
npm run dev
```

**Open:** http://localhost:5173

---

## 📖 Usage

### Web Dashboard

1. **Open the dashboard** at your deployed URL
2. **Enter a website URL** (e.g., `https://www.geeksforgeeks.org/`)
3. **Click "Analyze"**
4. **Wait 30 seconds** for analysis
5. **View results:**
   - Vendor count and SSP count
   - Prebid.js and GAM detection
   - Complete vendor list with categories
   - Interactive charts

### API

```bash
# Analyze a website
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com/",
    "device": "desktop",
    "timeout": 30000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://www.example.com/",
    "vendor_count": 18,
    "ssp_count": 12,
    "vendors": ["Prebid.js", "Google Ad Manager", ...],
    "prebid": {
      "detected": true,
      "config": {...}
    },
    "gam": {
      "detected": true,
      "slots": [...]
    }
  }
}
```

See [API.md](docs/API.md) for full documentation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         User Browser                    │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│    React Dashboard (Vite + Tailwind)    │
│    - URL input                          │
│    - Results visualization              │
│    - Interactive charts                 │
└───────────────┬─────────────────────────┘
                │ POST /api/analyze
                ↓
┌─────────────────────────────────────────┐
│    Express API Server                   │
│    - Request validation                 │
│    - MCP orchestration                  │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│    Chrome DevTools MCP                  │
│    - Navigate to URL                    │
│    - Capture network requests           │
│    - Query window objects               │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│    Analysis Engine                      │
│    - Network classification             │
│    - Vendor detection                   │
│    - API querying (Prebid/GAM)          │
│    - Pattern matching (30+ vendors)     │
└───────────────┬─────────────────────────┘
                │
                ↓
        JSON Response
```

---

## 📊 Sample Results

### Lifehacker.com (Record: 20 Vendors)
```
Vendors: Prebid.js, Google Ad Manager, Criteo, ID5,
         Amazon APS, The Trade Desk, Sharethrough,
         TripleLift, OpenX, Rubicon, Media.net,
         Sovrn, AppNexus, Index Exchange, PubMatic,
         Smart AdServer, 33Across, YellowBlue, OneTrust

SSPs: 11
Prebid: ✅ Detected
GAM: ✅ Detected (8 slots)
```

### GeeksForGeeks.org (18 Vendors)
```
Vendors: Prebid.js, Google Ad Manager, Amazon APS,
         Criteo, Index Exchange, PubMatic, Rubicon,
         AppNexus, OpenX, Media.net, TripleLift...

SSPs: 10
Prebid: ✅ Detected
GAM: ✅ Detected (12 slots)
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.3
- **MCP:** chrome-devtools-mcp
- **Server:** Express
- **Browser:** Chrome/Chromium (headless)

### Frontend
- **Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Language:** TypeScript

### Deployment
- **Hosting:** Render.com (100% free)
- **CDN:** Global edge network
- **SSL:** Auto-provisioned
- **CI/CD:** Auto-deploy from GitHub

---

## 📁 Project Structure

```
ad-tech-analyzer/
├── src/                    # Backend source
│   ├── mcp/               # MCP server & handlers
│   └── analyzer/          # Analysis engines
├── dashboard/             # Frontend React app
│   ├── src/              # React components
│   └── public/           # Static assets
├── docs/                  # Documentation
└── scripts/              # Deployment scripts
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed structure.

---

## 🚢 Deployment

### Render.com (Recommended - 100% Free)

**Features:**
- ✅ No credit card required
- ✅ 100GB bandwidth/month
- ✅ Auto-deploy from GitHub
- ✅ Global CDN
- ✅ Free SSL

**Deploy:**
```bash
./deploy-render-only.sh
```

See [RENDER_ONLY.md](RENDER_ONLY.md) for step-by-step guide.

---

### Self-Hosted

**Deploy with Cloudflare Tunnel:**
```bash
./deploy-selfhost.sh
```

See [TRULY_FREE_DEPLOY.md](TRULY_FREE_DEPLOY.md) for all options.

---

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](RENDER_ONLY.md)
- [Project Structure](PROJECT_STRUCTURE.md)
- [Free Hosting Options](TRULY_FREE_DEPLOY.md)

---

## 🧪 Testing

**Tested on 8+ major publishers:**
- ✅ 100% success rate
- ✅ 75% vendor detection rate
- ✅ Zero crashes
- ✅ Average 30s analysis time

**Test sites:**
- GeeksForGeeks, Lifehacker, IGN
- Carscoops, CardGames.io, TechCrunch
- BollywoodShaadis (AdPushup detection)

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

**Ways to contribute:**
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit PRs
- 📖 Improve docs
- ✨ Add vendor patterns

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Chrome DevTools MCP by Anthropic
- Prebid.js community
- Open-source ad-tech community

---

## 📧 Contact

- **Issues:** [GitHub Issues](https://github.com/YOUR-USERNAME/ad-tech-analyzer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR-USERNAME/ad-tech-analyzer/discussions)

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ for the ad-tech community**
