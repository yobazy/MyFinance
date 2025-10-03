#!/usr/bin/env python3
"""
Standalone Django server starter for MyFinance Dashboard
This script uses a custom WSGI server to avoid PyInstaller issues with Django's runserver
"""

import os
import sys
import django
from django.core.wsgi import get_wsgi_application
from wsgiref.simple_server import make_server

def main():
    print("🚀 Starting MyFinance Dashboard Backend...")
    
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    try:
        print("📋 Setting up Django...")
        django.setup()
        print("✅ Django setup complete")
        
        # Get port from command line arguments or default to 8000
        port = 8000
        if len(sys.argv) > 1:
            try:
                port = int(sys.argv[1])
            except ValueError:
                print(f"⚠️  Invalid port '{sys.argv[1]}', using default port 8000")
        
        print(f"🌐 Starting Django WSGI server on port {port}...")
        print("📡 Server will be available at: http://localhost:8000")
        print("🔄 Use Ctrl+C to stop the server")
        
        # Get WSGI application
        application = get_wsgi_application()
        
        # Create and start the server
        with make_server('127.0.0.1', port, application) as httpd:
            print(f"✅ Server running on http://127.0.0.1:{port}/")
            httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting Django server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
