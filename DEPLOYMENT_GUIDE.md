# GCP Cloud Run Deployment Guide

## Prerequisites

1. **Install gcloud CLI:**
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **Verify gcloud-mcp is connected:**
   ```bash
   claude mcp list | grep gcloud
   # Should show: ✓ Connected
   ```

## Deployment Steps

### Option 1: Use the Deployment Script (Recommended)

```bash
cd /Users/Dikshant/Desktop/Projects/ad-tech-analyzer
./deploy-to-gcp.sh
```

This script will:
1. Enable required GCP APIs
2. Build Docker image with Chromium
3. Push to Google Container Registry
4. Deploy to Cloud Run with 2GB RAM
5. Return your service URL

**Time:** ~8-10 minutes

### Option 2: Manual Deployment via gcloud MCP

Once gcloud-mcp is connected, you can ask Claude Code to:

- "Deploy ad-tech-analyzer to Cloud Run"
- "Enable Cloud Run API"
- "Check deployment status"
- "Get service URL"

The MCP server will execute gcloud commands on your behalf.

### Option 3: Manual gcloud Commands

```bash
# Set project
export PROJECT_ID=$(gcloud config get-value project)

# Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build and push
gcloud builds submit --tag gcr.io/$PROJECT_ID/ad-tech-analyzer

# Deploy
gcloud run deploy ad-tech-analyzer \
  --image gcr.io/$PROJECT_ID/ad-tech-analyzer \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300s \
  --max-instances 10 \
  --allow-unauthenticated \
  --port 3001

# Get URL
gcloud run services describe ad-tech-analyzer \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

## Testing

```bash
# Health check
curl https://YOUR-SERVICE-URL.run.app/health

# Full analysis test
curl -X POST https://YOUR-SERVICE-URL.run.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.geeksforgeeks.org/"}' | jq '.data.vendor_count'
```

**Expected:** vendor_count > 0

## Cost Estimate

**Free Tier (Monthly):**
- 2M requests
- 360k GB-seconds
- 180k vCPU-seconds

**With 2GB RAM:**
- ~12,000 analyses/month FREE
- Beyond: $3-8/month for moderate usage

**vs Render Standard:** $25/mo flat

## Troubleshooting

### gcloud-mcp shows "Failed to connect"

**Cause:** gcloud CLI not installed or not authenticated

**Fix:**
```bash
# Install gcloud
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud init

# Restart Claude Code
```

### Build timeout

**Fix:** Increase timeout
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/ad-tech-analyzer --timeout=20m
```

### Permission denied

**Fix:** Ensure you have Editor or Owner role on the project
```bash
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:YOUR_EMAIL"
```

## Next Steps

1. ✅ Deploy backend to Cloud Run
2. ✅ Update frontend VITE_API_URL with Cloud Run URL
3. ✅ Deploy frontend (Vercel/Render/GCP Storage)
4. ✅ Test end-to-end
5. ✅ Run QA test suite

## Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [gcloud-mcp Repository](https://github.com/googleapis/gcloud-mcp)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
