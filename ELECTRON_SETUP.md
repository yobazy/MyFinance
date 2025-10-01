# MyFinance Dashboard - Electron Setup

This document explains how to run and build the MyFinance Dashboard as an Electron application.

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher
- npm or yarn

## Installation

1. Install root dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Development

### Option 1: Using the smart startup script (Recommended)
```bash
# Automatically finds available ports and starts everything
npm run electron-start
```

### Option 2: Using npm scripts
```bash
# Start all services (Django + React + Electron)
npm run electron-dev
```

### Option 3: Manual startup
```bash
# Terminal 1: Start Django backend
npm run backend

# Terminal 2: Start React frontend
npm run frontend

# Terminal 3: Start Electron (wait for React to load)
npm run electron
```

### Option 4: Using the dev script
```bash
node electron/dev.js
```

## Building for Production

1. Build the React frontend:
```bash
npm run build-frontend
```

2. Build the Electron app:
```bash
npm run dist
```

The built application will be available in the `dist/` directory.

## Project Structure

```
MyFinance/
├── electron/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   └── dev.js           # Development helper script
├── frontend/            # React application
├── backend/             # Django backend
├── package.json         # Root package.json with Electron config
└── dist/                # Built Electron app (after build)
```

## Features

- **Automatic Backend Startup**: Django server starts automatically when Electron launches
- **Development Tools**: DevTools available in development mode
- **Menu Integration**: Native menu with keyboard shortcuts
- **Security**: Context isolation and secure IPC communication
- **Cross-Platform**: Builds for Windows, macOS, and Linux

## Troubleshooting

### Backend won't start
- Ensure Python dependencies are installed: `pip install -r requirements.txt`
- Check that Django can run: `cd backend && python manage.py runserver`

### Frontend won't load
- Ensure React dependencies are installed: `cd frontend && npm install`
- Check that React dev server starts: `cd frontend && npm start`

### Electron won't start
- Ensure Electron is installed: `npm install`
- Check Node.js version (should be v16+)

### Database issues
- The app uses SQLite by default
- Database files: `db.sqlite3` or `myfinance.db`
- Run migrations if needed: `cd backend && python manage.py migrate`

## Building for Distribution

The app is configured to build for multiple platforms:

- **macOS**: Creates a `.dmg` file
- **Windows**: Creates a `.exe` installer
- **Linux**: Creates an `AppImage`

Use `npm run dist` to build for your current platform, or configure electron-builder for specific targets.

## Configuration

Electron configuration is in `package.json` under the `build` section. You can modify:
- App ID and name
- Icon and metadata
- Build targets
- File inclusion/exclusion rules

## Security Notes

- The app uses context isolation for security
- Node integration is disabled in renderer processes
- External links open in the default browser
- IPC communication is restricted to specific channels
