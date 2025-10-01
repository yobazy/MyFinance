const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Debug logging
console.log('Electron app object:', app);
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
    width: 1400,
    height: 900,
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
    titleBarStyle: 'default'
  });

  // Load the app
  if (isDev) {
    // In development, load from React dev server
    mainWindow.loadURL('http://localhost:3001');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const indexPath = path.join(__dirname, '../frontend/build/index.html');
    mainWindow.loadFile(indexPath);
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
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const projectRoot = path.join(__dirname, '..');
    
    console.log('Starting Django backend...');
    
    backendProcess = spawn(pythonPath, ['manage.py', 'runserver', '8000', '--noreload'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend:', output);
      
      // Check if server is ready - Django shows different messages
      if (output.includes('Starting development server') || 
          output.includes('Quit the server with') ||
          output.includes('Watching for file changes') ||
          output.includes('System check identified no issues')) {
        console.log('✅ Backend server is ready');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Backend Error:', error);
      
      // Handle port already in use error
      if (error.includes('That port is already in use')) {
        console.log('Port 8000 is in use, trying port 8001...');
        backendProcess.kill();
        
        // Try alternative port
        backendProcess = spawn(pythonPath, ['manage.py', 'runserver', '8001', '--noreload'], {
          cwd: projectRoot,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        backendProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Backend (port 8001):', output);
          
          if (output.includes('Starting development server') || 
              output.includes('Quit the server with') ||
              output.includes('Watching for file changes') ||
              output.includes('System check identified no issues')) {
            console.log('✅ Backend server is ready (port 8001)');
            resolve();
          }
        });
        
        backendProcess.stderr.on('data', (data) => {
          const error = data.toString();
          console.error('Backend Error (port 8001):', error);
          
          if (!error.includes('WARNINGS') && !error.includes('Unrecognized')) {
            reject(new Error(error));
          }
        });
        
        return;
      }
      
      // Some Django warnings are sent to stderr but aren't fatal
      if (!error.includes('WARNINGS') && !error.includes('Unrecognized')) {
        reject(new Error(error));
      }
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      console.log('⚠️  Backend startup timeout - proceeding anyway');
      resolve(); // Don't reject, just proceed
    }, 20000);
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Transaction',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-transaction');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-data');
          }
        },
        { type: 'separator' },
        {
          role: 'quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
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
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[3].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Start backend first
    await startBackend();
    
    // Create window and menu
    createWindow();
    createMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Clean up backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Ensure backend process is killed
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// Handle database operations if needed
ipcMain.handle('get-database-path', () => {
  const dbPath = path.join(__dirname, '../db.sqlite3');
  const altDbPath = path.join(__dirname, '../myfinance.db');
  
  if (fs.existsSync(dbPath)) {
    return dbPath;
  } else if (fs.existsSync(altDbPath)) {
    return altDbPath;
  }
  
  return null;
});
