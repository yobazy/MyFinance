const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting MyFinance Dashboard with Node.js Backend...');
console.log('Electron version:', process.versions.electron);

// Check if app is properly loaded
if (!app) {
  console.error('❌ Electron app object is undefined!');
  console.error('This usually means Electron is not properly installed or there is a version mismatch.');
  process.exit(1);
}

// Keep a global reference of the window object
let mainWindow;
let backendProcess;

// Check if we're running in development
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../frontend/public/favicon.ico'),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    transparent: false,
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    titleBarOverlay: process.platform === 'darwin' ? {
      color: '#1a1a1a',
      symbolColor: '#f5f5f5',
      height: 28
    } : undefined
  });

  // Load the app
  if (isDev) {
    // In development, load from React dev server on port 3001
    mainWindow.loadURL('http://localhost:3001');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // For now, always use development server since we don't have a production build
    // TODO: Build production version when needed
    mainWindow.loadURL('http://localhost:3001');
    console.log('⚠️  Using development server (no production build available)');
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Node.js backend...');
    
    // Determine if we're in development or production
    const isPackaged = app.isPackaged;
    const projectRoot = path.join(__dirname, '..');
    
    let backendPath;
    let args;
    
    if (isPackaged) {
      // Production: Use the packaged Node.js backend
      console.log('🔧 Production mode: Using packaged Node.js backend');
      
      // Try to find Node.js executable
      const nodePaths = [
        'node',
        'nodejs',
        '/usr/bin/node',
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node'
      ];
      
      let nodeExecutable = null;
      for (const nodePath of nodePaths) {
        try {
          const result = require('child_process').execSync(`${nodePath} --version`, { timeout: 5000 });
          if (result) {
            nodeExecutable = nodePath;
            console.log(`✅ Found Node.js: ${nodePath}`);
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }
      
      if (!nodeExecutable) {
        console.error('❌ Node.js executable not found');
        console.log('⚠️  Proceeding without backend - app will show connection error');
        resolve();
        return;
      }
      
      backendPath = nodeExecutable;
      args = [path.join(process.resourcesPath, 'backend-nodejs/server.js')];
    } else {
      // Development: Use system Node.js
      console.log('🔧 Development mode: Using system Node.js');
      backendPath = 'node';
      args = [path.join(projectRoot, 'backend-nodejs/server.js')];
    }
    
    console.log('Starting backend with:', backendPath, args);
    console.log('Working directory:', projectRoot);
    
    // Start the backend process
    backendProcess = spawn(backendPath, args, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend:', output);
      
      // Check if server is ready
      if (output.includes('MyFinance Backend Server running') || 
          output.includes('API available at')) {
        console.log('✅ Backend server is ready');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Backend Error:', error);
      
      // Check for specific error patterns
      if (error.includes('EADDRINUSE')) {
        console.log('⚠️  Port 8000 is already in use, backend might already be running');
        resolve(); // Don't reject, just continue
      }
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        console.error('❌ Backend process exited with error');
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('⚠️  Backend startup timeout, proceeding anyway');
      resolve();
    }, 30000);
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Account',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/accounts');
          }
        },
        {
          label: 'Upload Data',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/upload');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/user-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
              mainWindow.webContents.closeDevTools();
            } else {
              mainWindow.webContents.openDevTools();
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/');
          }
        },
        {
          label: 'Accounts',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/accounts');
          }
        },
        {
          label: 'Transactions',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/transactions');
          }
        },
        {
          label: 'Analytics',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/visualizations');
          }
        },
        { type: 'separator' },
        {
          label: 'Upload Data',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('menu-navigate', '/upload');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About MyFinance Dashboard',
          click: () => {
            shell.openExternal('https://github.com/yourusername/my-finance-dash');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  console.log('📱 App is ready');
  
  // Start backend first
  try {
    await startBackend();
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    // Continue anyway, user will see connection error
  }
  
  // Create window and menu
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🛑 App is quitting, shutting down backend...');
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Handle menu navigation
ipcMain.on('menu-navigate', (event, route) => {
  if (mainWindow) {
    mainWindow.webContents.send('navigate-to', route);
  }
});

// Handle app updates (if using electron-updater)
ipcMain.on('check-for-updates', () => {
  // Implementation for auto-updater would go here
  console.log('Checking for updates...');
});

// IPC handlers for app information
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('get-database-path', () => {
  return path.join(app.getPath('userData'), 'db.sqlite3');
});

// Auto-updater IPC handlers (placeholder implementations)
ipcMain.handle('check-for-updates', async () => {
  console.log('Checking for updates...');
  // TODO: Implement actual update checking
  return { updateAvailable: false };
});

ipcMain.handle('download-update', async () => {
  console.log('Downloading update...');
  // TODO: Implement actual update downloading
  return { success: true };
});

ipcMain.handle('install-update', async () => {
  console.log('Installing update...');
  // TODO: Implement actual update installation
  return { success: true };
});

console.log('✅ Electron main process initialized');
