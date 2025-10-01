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
  console.log('Creating test window...');
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  // Load the test page
  const testPagePath = path.join(__dirname, '../test-page.html');
  console.log('Loading test page:', testPagePath);
  
  mainWindow.loadFile(testPagePath);

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Test window is ready');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Test page finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Test page failed to load:', errorCode, errorDescription, validatedURL);
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
