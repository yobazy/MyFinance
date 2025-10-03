#!/usr/bin/env python3
"""
Simple backend starter for MyFinance Dashboard
This script runs the Django server using the system Python instead of PyInstaller
"""

import os
import sys
import subprocess
import signal
import time
import json

def signal_handler(sig, frame):
    print('\n🛑 Shutting down backend...')
    sys.exit(0)

def main():
    print("🚀 Starting MyFinance Dashboard Backend...")
    print(f"Python executable: {sys.executable}")
    print(f"Script location: {__file__}")
    print(f"Current working directory: {os.getcwd()}")
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    try:
        # Get port from command line arguments or default to 8000
        port = 8000
        if len(sys.argv) > 1:
            try:
                port = int(sys.argv[1])
            except ValueError:
                print(f"⚠️  Invalid port '{sys.argv[1]}', using default port 8000")
        
        print(f"🌐 Starting Django server on port {port}...")
        print("📡 Server will be available at: http://localhost:8000")
        print("🔄 Use Ctrl+C to stop the server")
        
        # Start Django server using subprocess
        # Change to the directory containing manage.py
        script_dir = os.path.dirname(os.path.abspath(__file__))
        manage_py_path = os.path.join(script_dir, 'manage.py')
        
        print(f"📁 Script directory: {script_dir}")
        print(f"📁 Looking for manage.py at: {manage_py_path}")
        
        if not os.path.exists(manage_py_path):
            print(f"❌ manage.py not found at: {manage_py_path}")
            print(f"📁 Contents of script directory:")
            for item in os.listdir(script_dir):
                print(f"  - {item}")
            sys.exit(1)
        
        # Check if we can import Django
        try:
            import django
            print(f"✅ Django version: {django.get_version()}")
        except ImportError as e:
            print(f"❌ Django import failed: {e}")
            sys.exit(1)
        
        cmd = [sys.executable, manage_py_path, 'runserver', f'127.0.0.1:{port}', '--noreload']
        
        print(f"🔧 Running command: {' '.join(cmd)}")
        print(f"📁 Working directory: {script_dir}")
        
        # Start the server
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=script_dir)
        
        # Stream output
        for line in iter(process.stdout.readline, ''):
            print(line.rstrip())
        
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        if 'process' in locals():
            process.terminate()
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting Django server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
