#!/bin/bash

echo "🔍 MyFinance Dashboard - Production Debug Script"
echo "=============================================="

# Check current directory
echo "📁 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la

echo ""
echo "🐍 Python Environment Check:"
echo "Python version: $(python3 --version 2>/dev/null || echo 'Python3 not found')"
echo "Pip version: $(pip --version 2>/dev/null || echo 'Pip not found')"

echo ""
echo "📦 Project Structure Check:"
echo "manage.py exists: $([ -f "manage.py" ] && echo "✅ Yes" || echo "❌ No")"
echo "requirements.txt exists: $([ -f "requirements.txt" ] && echo "✅ Yes" || echo "❌ No")"
echo "backend/ directory exists: $([ -d "backend" ] && echo "✅ Yes" || echo "❌ No")"
echo "myfinance-backend.spec exists: $([ -f "myfinance-backend.spec" ] && echo "✅ Yes" || echo "❌ No")"

echo ""
echo "🔨 Build Artifacts Check:"
echo "dist/ directory exists: $([ -d "dist" ] && echo "✅ Yes" || echo "❌ No")"
if [ -d "dist" ]; then
    echo "Files in dist/:"
    ls -la dist/
fi

echo ""
echo "📱 Electron App Check:"
if [ -d "dist/mac-arm64/MyFinance Dashboard.app" ]; then
    echo "✅ Electron app exists"
    echo "Backend files in app:"
    ls -la "dist/mac-arm64/MyFinance Dashboard.app/Contents/Resources/backend/" 2>/dev/null || echo "No backend directory in app"
else
    echo "❌ Electron app not found"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Run: chmod +x build-backend-debug.sh && ./build-backend-debug.sh"
echo "2. Check the output for any errors"
echo "3. If successful, update package.json and main-production.js"
