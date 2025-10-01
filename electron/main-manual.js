const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Electron app object:', app);
console.log('Electron version:', process.versions.electron);

if (!app) {
  console.error('❌ Electron app object is undefined!');
  process.exit(1);
}

let mainWindow;

function createWindow() {
  console.log('Creating manual test window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Load the manual HTML file
  const indexPath = path.join(__dirname, '../frontend/build/index-manual.html');
  console.log('Loading manual HTML from:', indexPath);
  
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Manual window is ready');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Manual HTML finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Manual HTML failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 Manual HTML started loading');
  });

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log('✅ Electron app is ready');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
