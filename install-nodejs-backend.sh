#!/bin/bash

echo "🚀 Installing Node.js Backend Dependencies..."
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm version: $NPM_VERSION"

# Create backend-nodejs directory if it doesn't exist
if [ ! -d "backend-nodejs" ]; then
    echo "❌ backend-nodejs directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to backend-nodejs directory
cd backend-nodejs

echo ""
echo "📦 Installing Node.js dependencies..."
echo "====================================="

# Install dependencies
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🔧 Setting up database..."
echo "========================="

# Create uploads directory
mkdir -p uploads
echo "✅ Created uploads directory"

# Create backups directory
mkdir -p backups
echo "✅ Created backups directory"

echo ""
echo "🧪 Running initial database setup..."
echo "==================================="

# Start the server briefly to initialize database
timeout 10s npm start || true

echo ""
echo "✅ Node.js backend setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run start-nodejs"
echo ""
echo "🔧 To start just the backend:"
echo "   npm run backend-nodejs"
echo ""
echo "🧪 To test the backend:"
echo "   node test-nodejs-backend.js"
echo ""
echo "📚 For more information, see MIGRATION_TO_NODEJS.md"
