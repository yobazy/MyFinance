#!/usr/bin/env python3
"""
Simple test script to verify PyInstaller works
"""

import sys
import os

def main():
    print("🚀 Simple PyInstaller Test")
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Script location: {__file__}")
    print("✅ Test completed successfully!")
    
    # Check if we can import Django
    try:
        import django
        print(f"Django version: {django.get_version()}")
        print("✅ Django import successful")
    except ImportError as e:
        print(f"❌ Django import failed: {e}")
    
    # Check if we can find the database
    db_paths = [
        "db.sqlite3",
        os.path.join(os.getcwd(), "db.sqlite3"),
        os.path.join(os.path.dirname(__file__), "db.sqlite3"),
    ]
    
    for path in db_paths:
        if os.path.exists(path):
            print(f"📁 Found database at: {path}")
            break
    else:
        print("⚠️  No database found")

if __name__ == '__main__':
    main()
