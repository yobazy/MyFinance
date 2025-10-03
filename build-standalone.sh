#!/bin/bash

echo "🚀 Building MyFinance Dashboard - Standalone Version"
echo "=================================================="

# Step 1: Build standalone Python backend
echo "📦 Step 1: Building standalone Python backend..."
chmod +x build-backend.sh
./build-backend.sh

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

# Step 2: Build frontend
echo "🎨 Step 2: Building frontend..."
npm run build-frontend

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

# Step 3: Update main-production.js with standalone backend code
echo "⚙️  Step 3: Updating Electron main process..."
cp electron/startBackend-standalone.js electron/main-production-temp.js
# Replace the startBackend function in main-production.js
# This is a simplified approach - you might want to manually update the file

# Step 4: Build Electron app
echo "🔨 Step 4: Building Electron application..."
npx electron-builder --publish=never

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 DMG files created in dist/ directory"
    echo "🎉 Your standalone app is ready!"
else
    echo "❌ Electron build failed!"
    exit 1
fi
