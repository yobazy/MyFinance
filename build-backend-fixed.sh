#!/bin/bash

echo "🔨 Building standalone Python backend (Fixed Version)..."

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found. Are you in the project root?"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "Installing PyInstaller..."
    pip install pyinstaller
fi

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build/ dist/myfinance-backend

# Build the standalone executable
echo "Creating standalone backend executable..."
pyinstaller myfinance-backend.spec --clean --noconfirm

# Check if build was successful
if [ -f "dist/myfinance-backend" ]; then
    echo "✅ Backend executable created successfully!"
    echo "📁 Location: dist/myfinance-backend"
    ls -la dist/myfinance-backend
    
    # Test if the executable works
    echo "🧪 Testing the executable..."
    echo "Running: ./dist/myfinance-backend --help"
    ./dist/myfinance-backend --help
else
    echo "❌ Backend build failed!"
    echo "Checking for any error logs..."
    if [ -f "build/myfinance-backend/warn-myfinance-backend.txt" ]; then
        echo "Build warnings:"
        cat build/myfinance-backend/warn-myfinance-backend.txt
    fi
    exit 1
fi

echo "🎉 Standalone backend is ready!"
