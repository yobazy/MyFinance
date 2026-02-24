#!/bin/bash

echo "🎬 MyFinance Dashboard - Screenshot Automation Setup"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

echo "✅ Node.js and Python3 are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "�� Installing Playwright browsers..."
npx playwright install

echo ""
echo "🚀 Setup complete! You can now use the following commands:"
echo ""
echo "  npm run screenshots        - Capture all screenshots"
echo "  npm run screenshots:update - Update existing screenshots"
echo "  npm run screenshots:all    - Capture comprehensive set"
echo ""
echo "�� Before running screenshots, make sure both servers are running:"
echo "   Frontend: cd frontend && npm start"
echo "   Backend:  python manage.py runserver"
echo ""
echo "📸 Screenshots will be saved to: ./screenshots/"
