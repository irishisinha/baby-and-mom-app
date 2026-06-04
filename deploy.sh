#!/bin/bash

# ===================================================================
# IMPORTANT: This script MUST be used for all production deployments
# It automatically updates the alias so baby-and-mom-app.vercel.app
# always points to the latest build.
# 
# User has committed to sharing this link:
# https://baby-and-mom-app.vercel.app
# 
# NEVER deploy without updating the alias!
# ===================================================================

echo "Deploying to production..."
DEPLOY_OUTPUT=$(vercel --prod 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract the deployment URL from output
DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://baby-and-mom-\w+-rishisinhax-4807s-projects\.vercel\.app' | head -1)

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "Error: Could not extract deployment URL"
    exit 1
fi

echo ""
echo "Updating alias: baby-and-mom-app.vercel.app → $DEPLOYMENT_URL"
vercel alias set "$DEPLOYMENT_URL" baby-and-mom-app.vercel.app

echo ""
echo "✓ Deployment complete!"
echo "   Live: https://baby-and-mom-app.vercel.app (share this link with family)"
echo "   Deployment: $DEPLOYMENT_URL"
