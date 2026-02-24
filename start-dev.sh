#!/bin/bash

# MyFinance Web App Development Startup Script
# This script starts both Django backend and React frontend in development mode

echo "🚀 Starting MyFinance Web Application (Development Mode)..."

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

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $DJANGO_PID $REACT_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Django backend in background
echo "🔧 Starting Django backend server..."
python manage.py runserver &
DJANGO_PID=$!

# Wait a moment for Django to start
sleep 2

# Start React frontend
echo "⚛️  Starting React development server..."
cd frontend
npm start &
REACT_PID=$!
cd ..

echo ""
echo "✅ Development servers started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000/api/"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
