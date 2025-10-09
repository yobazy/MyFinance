const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🚀 Minimal Electron test...');

app.whenReady().then(() => {
  console.log('✅ App is ready');
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Try to load the frontend
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  console.log('📁 Trying to load:', indexPath);
  
  if (require('fs').existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
    console.log('✅ Frontend loaded');
  } else {
    console.log('❌ Frontend not found');
    mainWindow.loadURL('data:text/html,<h1>Frontend not found</h1>');
  }
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('❌ Page failed to load:', errorCode, errorDescription);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
