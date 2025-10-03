#!/bin/bash

echo "🧹 MyFinance Dashboard - Django Cleanup Script"
echo "=============================================="
echo ""
echo "This script will remove unused Django files after migration to Node.js backend."
echo "⚠️  WARNING: This will permanently delete Django files!"
echo ""

# Ask for confirmation
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting cleanup process..."
echo ""

# Function to safely remove files/directories
safe_remove() {
    local path="$1"
    local description="$2"
    
    if [ -e "$path" ]; then
        echo "🗑️  Removing $description: $path"
        rm -rf "$path"
        if [ $? -eq 0 ]; then
            echo "✅ Successfully removed $description"
        else
            echo "❌ Failed to remove $description"
        fi
    else
        echo "ℹ️  $description not found: $path"
    fi
}

# Remove Django backend directory
safe_remove "backend" "Django backend directory"

# Remove Python-related files
safe_remove "requirements.txt" "Python requirements file"
safe_remove "manage.py" "Django management script"
safe_remove "Home.py" "Streamlit home file"
safe_remove "simple_backend.py" "Simple backend script"
safe_remove "start_server.py" "Django start server script"
safe_remove "test_simple.py" "Simple test file"
safe_remove "test_simple.spec" "PyInstaller spec file"

# Remove Python virtual environment
safe_remove "venv" "Python virtual environment"

# Remove Django build artifacts
safe_remove "build" "Django build directory"
safe_remove "myfinance-backend.spec" "PyInstaller spec file"

# Remove Django build scripts
safe_remove "build-backend-debug.sh" "Django build debug script"
safe_remove "build-backend-fixed.sh" "Django build fixed script"
safe_remove "build-backend.sh" "Django build script"
safe_remove "build-standalone.sh" "Django standalone build script"
safe_remove "build.py" "Django build Python script"
safe_remove "debug-production.sh" "Django debug production script"

# Remove old Electron main files (keep the new one)
safe_remove "electron/main-production.js" "Old Django production main file"
safe_remove "electron/main.js" "Old Django main file"
safe_remove "electron/main-manual.js" "Old manual main file"
safe_remove "electron/main-no-backend.js" "Old no-backend main file"
safe_remove "electron/main-react-test.js" "Old React test main file"
safe_remove "electron/main-test.js" "Old test main file"
safe_remove "electron/startBackend-standalone.js" "Old standalone backend starter"
safe_remove "electron/startBackend-updated.js" "Old updated backend starter"

# Remove old start scripts (keep the new Node.js one)
safe_remove "start-electron.js" "Old Electron start script"
safe_remove "start-minimal.js" "Old minimal start script"
safe_remove "start-simple.js" "Old simple start script"
safe_remove "start-with-build.js" "Old build start script"

# Remove old test files
safe_remove "test-electron-only.js" "Old Electron-only test"
safe_remove "test-manual.js" "Old manual test"
safe_remove "test-react-electron.js" "Old React-Electron test"
safe_remove "test-page.html" "Old test page"

# Remove packaging directory (Django-specific)
safe_remove "packaging" "Django packaging directory"

# Remove Django-specific documentation
safe_remove "DATABASE_BACKUP_README.md" "Django database backup README"
safe_remove "ELECTRON_SETUP.md" "Old Electron setup documentation"

# Remove Django-specific configuration files
safe_remove "settings.json" "Django settings file"

# Remove old package files
safe_remove "package-files-update.json" "Old package files update"
safe_remove "package-scripts-update.json" "Old package scripts update"
safe_remove "release-manager-update.js" "Old release manager update"

echo ""
echo "🧹 Cleanup Summary"
echo "=================="
echo "✅ Removed Django backend directory"
echo "✅ Removed Python dependencies and scripts"
echo "✅ Removed Django build artifacts"
echo "✅ Removed old Electron main files"
echo "✅ Removed old start scripts"
echo "✅ Removed old test files"
echo "✅ Removed Django-specific documentation"
echo "✅ Removed Django configuration files"
echo ""
echo "🎉 Cleanup completed successfully!"
echo ""
echo "📋 What's left:"
echo "   ✅ backend-nodejs/ - New Node.js backend"
echo "   ✅ electron/main-nodejs.js - New Electron main file"
echo "   ✅ start-nodejs.js - New Node.js start script"
echo "   ✅ test-nodejs-backend.js - New backend test script"
echo "   ✅ install-nodejs-backend.sh - Installation script"
echo "   ✅ MIGRATION_TO_NODEJS.md - Migration documentation"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: ./install-nodejs-backend.sh"
echo "   2. Test: node test-nodejs-backend.js"
echo "   3. Start: npm run start-nodejs"
echo ""
echo "📚 For more information, see MIGRATION_TO_NODEJS.md"
