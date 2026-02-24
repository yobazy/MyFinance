#!/bin/bash

# MyFinance Web App Startup Script

echo "🚀 Starting MyFinance Web Application..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Run Django migrations
echo "🗄️  Running database migrations..."
python manage.py migrate

# Build React app for production
echo "🏗️  Building React app..."
cd frontend
npm run build
cd ..

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Start Django server
echo "✅ Starting Django server..."
echo "🌐 Application will be available at http://localhost:8000"
echo "📊 API endpoints available at http://localhost:8000/api/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python manage.py runserver
