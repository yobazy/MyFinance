import { useState, useEffect, useCallback } from 'react';

const useAutoUpdater = () => {
  const [currentVersion, setCurrentVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error

  // Get current version on mount
  useEffect(() => {
    const getVersion = async () => {
      try {
        if (window.electronAPI) {
          const version = await window.electronAPI.getAppVersion();
          setCurrentVersion(version);
        }
      } catch (error) {
        console.error('Failed to get app version:', error);
      }
    };

    getVersion();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleUpdateChecking = () => {
      setIsChecking(true);
      setUpdateStatus('checking');
      setUpdateError(null);
    };

    const handleUpdateAvailable = (event, info) => {
      setIsChecking(false);
      setUpdateInfo(info);
      setUpdateStatus('available');
      setUpdateError(null);
    };

    const handleUpdateNotAvailable = () => {
      setIsChecking(false);
      setUpdateStatus('idle');
      setUpdateError(null);
    };

    const handleUpdateError = (event, error) => {
      setIsChecking(false);
      setIsDownloading(false);
      setUpdateError(error);
      setUpdateStatus('error');
    };

    const handleDownloadProgress = (event, progressObj) => {
      setDownloadProgress(progressObj.percent);
    };

    const handleUpdateDownloaded = () => {
      setIsDownloading(false);
      setUpdateStatus('downloaded');
    };

    // Register event listeners
    window.electronAPI.onUpdateChecking(handleUpdateChecking);
    window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
    window.electronAPI.onUpdateNotAvailable(handleUpdateNotAvailable);
    window.electronAPI.onUpdateError(handleUpdateError);
    window.electronAPI.onDownloadProgress(handleDownloadProgress);
    window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);

    // Cleanup
    return () => {
      window.electronAPI.removeAllListeners('update-checking');
      window.electronAPI.removeAllListeners('update-available');
      window.electronAPI.removeAllListeners('update-not-available');
      window.electronAPI.removeAllListeners('update-error');
      window.electronAPI.removeAllListeners('download-progress');
      window.electronAPI.removeAllListeners('update-downloaded');
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.checkForUpdates();
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setUpdateError(error.message);
      setUpdateStatus('error');
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    try {
      setIsDownloading(true);
      setUpdateStatus('downloading');
      if (window.electronAPI) {
        await window.electronAPI.downloadUpdate();
      }
    } catch (error) {
      console.error('Failed to download update:', error);
      setUpdateError(error.message);
      setUpdateStatus('error');
      setIsDownloading(false);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.installUpdate();
      }
    } catch (error) {
      console.error('Failed to install update:', error);
      setUpdateError(error.message);
      setUpdateStatus('error');
    }
  }, []);

  return {
    currentVersion,
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    updateError,
    updateStatus,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  };
};

export default useAutoUpdater;
