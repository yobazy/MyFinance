#!/bin/bash

echo "🔨 Building standalone Python backend..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Install PyInstaller if not already installed
pip install pyinstaller

# Build the standalone executable
echo "Creating standalone backend executable..."
pyinstaller myfinance-backend.spec --clean

# Check if build was successful
if [ -f "dist/myfinance-backend" ]; then
    echo "✅ Backend executable created successfully!"
    echo "📁 Location: dist/myfinance-backend"
else
    echo "❌ Backend build failed!"
    exit 1
fi

echo "🎉 Standalone backend is ready!"
