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

// Import ProcessManager with fallback for production builds
let ProcessManager;
console.log('🔄 Loading ProcessManager...');
console.log('📁 App packaged:', app.isPackaged);
console.log('📁 Resources path:', process.resourcesPath);

try {
  // Try development path first
  console.log('🔄 Trying development path...');
  ProcessManager = require('../backend-nodejs/utils/processManager');
  console.log('✅ ProcessManager loaded from development path');
} catch (error) {
  console.log('❌ Development path failed:', error.message);
  try {
    // Try production path (packaged app)
    console.log('🔄 Trying production path...');
    ProcessManager = require(path.join(process.resourcesPath, 'backend-nodejs/utils/processManager'));
    console.log('✅ ProcessManager loaded from production path');
  } catch (prodError) {
    console.error('❌ Could not load ProcessManager:', error.message);
    console.error('❌ Production path also failed:', prodError.message);
    // Create a fallback ProcessManager
    ProcessManager = class FallbackProcessManager {
      async startBackend(projectRoot, isPackaged) {
        console.log('⚠️  Using fallback process manager - limited functionality');
        // Basic spawn without advanced features
        const { spawn } = require('child_process');
        const backendPath = isPackaged ? 
          path.join(process.resourcesPath, 'backend-nodejs/server.js') :
          path.join(projectRoot, 'backend-nodejs/server.js');
        
        console.log('📁 Backend path:', backendPath);
        
        const backendProcess = spawn('node', [backendPath], {
          cwd: projectRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PORT: '8000' }
        });
        
        return { process: backendProcess, port: 8000, pid: backendProcess.pid };
      }
      
      async stopBackend() {
        console.log('⚠️  Fallback process manager - basic cleanup');
      }
    };
    console.log('⚠️  Using fallback ProcessManager');
  }
}

// Keep a global reference of the window object
let mainWindow;
let processManager;

// Check if we're running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
    icon: path.join(__dirname, '../frontend/public/logo512.png'),
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
    // In production, load the built React files
    console.log('📁 Loading production build...');
    console.log('📁 App packaged:', app.isPackaged);
    console.log('📁 Resources path:', process.resourcesPath);
    
    // Try multiple paths for the frontend build
    const possiblePaths = [
      path.join(__dirname, '../frontend/build/index.html'),
      path.join(process.resourcesPath, 'frontend/build/index.html'),
      path.join(process.resourcesPath, 'app.asar.unpacked/frontend/build/index.html')
    ];
    
    let frontendLoaded = false;
    
    for (const indexPath of possiblePaths) {
      console.log('📁 Trying path:', indexPath);
      if (fs.existsSync(indexPath)) {
        try {
          mainWindow.loadFile(indexPath);
          console.log('✅ Production build loaded successfully from:', indexPath);
          frontendLoaded = true;
          break;
        } catch (error) {
          console.error('❌ Error loading from path:', indexPath, error.message);
        }
      } else {
        console.log('📁 Path does not exist:', indexPath);
      }
    }
    
    if (!frontendLoaded) {
      console.error('❌ Could not load frontend from any path');
      console.log('⚠️  Loading error page');
      mainWindow.loadURL('data:text/html,<h1>Frontend not found</h1><p>Please check the build configuration.</p>');
    }
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

async function startBackend() {
  try {
    console.log('🚀 Starting Node.js backend...');
    
    // Determine if we're in development or production
    const isPackaged = app.isPackaged;
    const projectRoot = path.join(__dirname, '..');
    
    // Always use fallback method for now to test
    console.log('⚠️  Using fallback backend startup...');
    // Basic backend startup without ProcessManager
    const { spawn } = require('child_process');
    const backendPath = isPackaged ? 
      path.join(process.resourcesPath, 'backend-nodejs/server.js') :
      path.join(projectRoot, 'backend-nodejs/server.js');
    
    console.log('📁 Backend path:', backendPath);
    console.log('📁 Backend path exists:', fs.existsSync(backendPath));
    
    const backendProcess = spawn('node', [backendPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '8000' }
    });
    
    // Add process event handlers
    backendProcess.stdout.on('data', (data) => {
      console.log('Backend stdout:', data.toString());
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.log('Backend stderr:', data.toString());
    });
    
    backendProcess.on('error', (error) => {
      console.error('Backend process error:', error);
    });
    
    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
    
    console.log('✅ Backend started with fallback method');
    console.log(`🆔 Backend PID: ${backendProcess.pid}`);
    
    return { process: backendProcess, port: 8000, pid: backendProcess.pid };
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    console.log('⚠️  Proceeding without backend - app will show connection error');
    throw error;
  }
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

app.on('before-quit', async () => {
  console.log('🛑 App is quitting, shutting down backend...');
  if (processManager) {
    await processManager.stopBackend();
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
