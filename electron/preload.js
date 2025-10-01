const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Auto-updater event listeners
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-transaction', () => callback(null, 'menu-new-transaction'));
    ipcRenderer.on('menu-import-data', () => callback(null, 'menu-import-data'));
    ipcRenderer.on('menu-export-data', () => callback(null, 'menu-export-data'));
    ipcRenderer.on('menu-preferences', () => callback(null, 'menu-preferences'));
    ipcRenderer.on('menu-toggle-sidebar', () => callback(null, 'menu-toggle-sidebar'));
    ipcRenderer.on('menu-navigate', (event, path) => callback(null, 'menu-navigate', path));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log that preload script has loaded
console.log('Electron preload script loaded');
