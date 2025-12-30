#!/bin/bash
# Deploy Ad-Tech Analyzer to GCP Cloud Run

set -e  # Exit on error

echo "🚀 Deploying Ad-Tech Analyzer to GCP Cloud Run..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No GCP project selected. Run: gcloud init"
    exit 1
fi

echo "📦 Project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build and push Docker image
echo "🐳 Building Docker image (this takes ~5-8 minutes)..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/ad-tech-analyzer

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
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

# Get service URL
SERVICE_URL=$(gcloud run services describe ad-tech-analyzer \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Test with:"
echo "  curl $SERVICE_URL/health"
echo ""
echo "  curl -X POST $SERVICE_URL/api/analyze \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"url\":\"https://www.geeksforgeeks.org/\"}'"
echo ""
echo "💡 Update your frontend VITE_API_URL to: $SERVICE_URL"
