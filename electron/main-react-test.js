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
  console.log('Creating React test window...');
  
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

  // Load the React app
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  console.log('Loading React app from:', indexPath);
  
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    console.log('✅ React window is ready');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ React app finished loading');
    
    // Inject debugging JavaScript
    mainWindow.webContents.executeJavaScript(`
      console.log('🔍 React app debugging:');
      console.log('Document ready state:', document.readyState);
      console.log('React root element:', document.getElementById('root'));
      console.log('React root children:', document.getElementById('root')?.children.length);
      console.log('Current URL:', window.location.href);
      
      // Check if React is loaded
      if (window.React) {
        console.log('✅ React is loaded');
      } else {
        console.log('❌ React is not loaded');
      }
      
      // Check for any errors
      window.addEventListener('error', (e) => {
        console.error('❌ JavaScript error:', e.error);
      });
      
      // Check network requests
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('🌐 API call:', args[0]);
        return originalFetch.apply(this, args)
          .then(response => {
            console.log('✅ API response:', response.status, args[0]);
            return response;
          })
          .catch(error => {
            console.error('❌ API error:', error, args[0]);
            throw error;
          });
      };
    `);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ React app failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 React app started loading');
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
