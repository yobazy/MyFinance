#!/usr/bin/env python3
"""
Standalone Django server starter for MyFinance Dashboard
This script bypasses Django's management command system to avoid PyInstaller issues
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.core.wsgi import get_wsgi_application

def main():
    print("🚀 Starting MyFinance Dashboard Backend...")
    
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    try:
        print("📋 Setting up Django...")
        django.setup()
        print("✅ Django setup complete")
        
        # Start the development server
        print("🌐 Starting Django development server on port 8000...")
        print("📡 Server will be available at: http://localhost:8000")
        print("🔄 Use Ctrl+C to stop the server")
        
        # Use execute_from_command_line to start the server
        execute_from_command_line(['start_server.py', 'runserver', '8000', '--noreload'])
        
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
