const { dialog, app } = require('electron');
const path = require('path');

// Import autoUpdater only when needed to avoid initialization errors
let autoUpdater = null;

class AutoUpdaterService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isUpdateAvailable = false;
    this.updateInfo = null;
    
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // Import autoUpdater only when app is ready
    if (!autoUpdater) {
      try {
        const { autoUpdater: updater } = require('electron-updater');
        autoUpdater = updater;
      } catch (error) {
        console.error('Failed to load electron-updater:', error);
        return;
      }
    }

    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, let user choose
    autoUpdater.autoInstallOnAppQuit = true; // Install on app quit
    
    // Set update server (GitHub releases)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'yobazy', // Your GitHub username
      repo: 'MyFinance' // Your repo name
    });

    // Event listeners
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.isUpdateAvailable = true;
      this.updateInfo = info;
      this.sendToRenderer('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.sendToRenderer('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.sendToRenderer('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      this.sendToRenderer('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', info);
      
      // Show dialog to restart
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded successfully. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  checkForUpdates() {
    console.log('Checking for updates...');
    autoUpdater.checkForUpdates();
  }

  downloadUpdate() {
    if (this.isUpdateAvailable) {
      console.log('Downloading update...');
      autoUpdater.downloadUpdate();
    }
  }

  installUpdate() {
    autoUpdater.quitAndInstall();
  }

  getCurrentVersion() {
    return app.getVersion();
  }

  sendToRenderer(channel, data = null) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = AutoUpdaterService;
