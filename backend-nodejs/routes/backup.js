const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { BackupSettings, DatabaseBackup } = require('../models');
const { sequelize } = require('../config/database');
const BackupService = require('../services/BackupService');
const BackupScheduler = require('../services/BackupScheduler');
const CloudStorageService = require('../services/CloudStorageService');
const BackupMonitoringService = require('../services/BackupMonitoringService');

const router = express.Router();

// Validation middleware
const validateBackupCreation = [
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
  body('compress').optional().isBoolean(),
  body('encrypt').optional().isBoolean(),
  body('encryptionKey').optional().isString().isLength({ min: 8, max: 255 })
];

const validateSettingsUpdate = [
  body('maxBackups').optional().isInt({ min: 1, max: 100 }),
  body('autoBackupEnabled').optional().isBoolean(),
  body('backupFrequencyHours').optional().isInt({ min: 1, max: 168 }), // Max 1 week
  body('backupLocation').optional().isString().isLength({ min: 1, max: 500 }),
  body('compressionEnabled').optional().isBoolean(),
  body('encryptionEnabled').optional().isBoolean(),
  body('encryptionKey').optional().isString().isLength({ min: 8, max: 255 }),
  body('retentionDays').optional().isInt({ min: 1, max: 3650 }), // Max 10 years
  body('maxBackupSize').optional().isInt({ min: 1024 * 1024, max: 1024 * 1024 * 1024 * 100 }), // 1MB to 100GB
  body('cloudStorageEnabled').optional().isBoolean(),
  body('cloudProvider').optional().isIn(['aws_s3', 'google_cloud', 'azure']),
  body('cloudConfig').optional().isObject()
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Check if auto backup should be created
router.get('/check-auto', async (req, res) => {
  try {
    const settings = await BackupSettings.findOne();
    
    if (!settings || !settings.autoBackupEnabled) {
      return res.json({ backup_created: false, reason: 'Auto backup disabled' });
    }
    
    const now = new Date();
    const lastBackup = settings.lastBackup ? new Date(settings.lastBackup) : null;
    
    // Check if enough time has passed since last backup
    const hoursSinceLastBackup = lastBackup 
      ? (now - lastBackup) / (1000 * 60 * 60)
      : settings.backupFrequencyHours + 1; // Force backup if never backed up
    
    if (hoursSinceLastBackup >= settings.backupFrequencyHours) {
      try {
        const result = await BackupService.createBackup({
          type: 'auto',
          notes: 'Automated backup',
          compress: settings.compressionEnabled,
          encrypt: settings.encryptionEnabled,
          encryptionKey: settings.encryptionKey
        });

        return res.json({ 
          backup_created: true, 
          backup: result.backup
        });
      } catch (error) {
        return res.status(500).json({ 
          backup_created: false, 
          error: 'Failed to create backup', 
          details: error.message 
        });
      }
    }
    
    return res.json({ backup_created: false, reason: 'Not time for backup yet' });
  } catch (error) {
    console.error('Error checking auto backup:', error);
    res.status(500).json({ error: 'Failed to check auto backup', details: error.message });
  }
});

// Get backup settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await BackupSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await BackupSettings.create({
        maxBackups: 5,
        autoBackupEnabled: true,
        backupFrequencyHours: 24,
        backupLocation: 'backups/',
        compressionEnabled: true,
        encryptionEnabled: false,
        retentionDays: 30,
        maxBackupSize: 1024 * 1024 * 1024 // 1GB
      });
    }

    res.json({
      id: settings.id,
      maxBackups: settings.maxBackups,
      autoBackupEnabled: settings.autoBackupEnabled,
      backupFrequencyHours: settings.backupFrequencyHours,
      lastBackup: settings.lastBackup,
      backupLocation: settings.backupLocation,
      compressionEnabled: settings.compressionEnabled,
      encryptionEnabled: settings.encryptionEnabled,
      retentionDays: settings.retentionDays,
      maxBackupSize: settings.maxBackupSize,
      cloudStorageEnabled: settings.cloudStorageEnabled,
      cloudProvider: settings.cloudProvider
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update backup settings
router.put('/settings', validateSettingsUpdate, handleValidationErrors, async (req, res) => {
  try {
    const {
      maxBackups,
      autoBackupEnabled,
      backupFrequencyHours,
      backupLocation,
      compressionEnabled,
      encryptionEnabled,
      encryptionKey,
      retentionDays,
      maxBackupSize,
      cloudStorageEnabled,
      cloudProvider,
      cloudConfig
    } = req.body;

    let settings = await BackupSettings.findOne();
    
    if (!settings) {
      settings = await BackupSettings.create({
        maxBackups: maxBackups || 5,
        autoBackupEnabled: autoBackupEnabled !== undefined ? autoBackupEnabled : true,
        backupFrequencyHours: backupFrequencyHours || 24,
        backupLocation: backupLocation || 'backups/',
        compressionEnabled: compressionEnabled !== undefined ? compressionEnabled : true,
        encryptionEnabled: encryptionEnabled || false,
        encryptionKey: encryptionKey || null,
        retentionDays: retentionDays || 30,
        maxBackupSize: maxBackupSize || 1024 * 1024 * 1024,
        cloudStorageEnabled: cloudStorageEnabled || false,
        cloudProvider: cloudProvider || null,
        cloudConfig: cloudConfig || null
      });
    } else {
      if (maxBackups !== undefined) settings.maxBackups = maxBackups;
      if (autoBackupEnabled !== undefined) settings.autoBackupEnabled = autoBackupEnabled;
      if (backupFrequencyHours !== undefined) settings.backupFrequencyHours = backupFrequencyHours;
      if (backupLocation !== undefined) settings.backupLocation = backupLocation;
      if (compressionEnabled !== undefined) settings.compressionEnabled = compressionEnabled;
      if (encryptionEnabled !== undefined) settings.encryptionEnabled = encryptionEnabled;
      if (encryptionKey !== undefined) settings.encryptionKey = encryptionKey;
      if (retentionDays !== undefined) settings.retentionDays = retentionDays;
      if (maxBackupSize !== undefined) settings.maxBackupSize = maxBackupSize;
      if (cloudStorageEnabled !== undefined) settings.cloudStorageEnabled = cloudStorageEnabled;
      if (cloudProvider !== undefined) settings.cloudProvider = cloudProvider;
      if (cloudConfig !== undefined) settings.cloudConfig = cloudConfig;
      
      await settings.save();
    }

    // Update scheduler if auto backup settings changed
    if (autoBackupEnabled !== undefined || backupFrequencyHours !== undefined) {
      await BackupScheduler.updateSchedule(settings);
    }

    // Initialize cloud storage if enabled
    if (cloudStorageEnabled && cloudProvider && cloudConfig) {
      try {
        await CloudStorageService.initialize({ [cloudProvider]: cloudConfig });
      } catch (error) {
        console.warn('Failed to initialize cloud storage:', error.message);
      }
    }

    res.json({
      id: settings.id,
      maxBackups: settings.maxBackups,
      autoBackupEnabled: settings.autoBackupEnabled,
      backupFrequencyHours: settings.backupFrequencyHours,
      lastBackup: settings.lastBackup,
      backupLocation: settings.backupLocation,
      compressionEnabled: settings.compressionEnabled,
      encryptionEnabled: settings.encryptionEnabled,
      retentionDays: settings.retentionDays,
      maxBackupSize: settings.maxBackupSize,
      cloudStorageEnabled: settings.cloudStorageEnabled,
      cloudProvider: settings.cloudProvider
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all backups
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (type) whereClause.backupType = type;
    if (status) whereClause.status = status;

    const { count, rows: backups } = await DatabaseBackup.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const backupsWithSize = backups.map(backup => ({
      id: backup.id,
      fileName: backup.fileName,
      backupType: backup.backupType,
      filePath: backup.filePath,
      fileSize: backup.fileSize,
      fileSizeMb: Math.round(backup.fileSize / (1024 * 1024) * 100) / 100,
      isCompressed: backup.isCompressed,
      isEncrypted: backup.isEncrypted,
      checksum: backup.checksum,
      status: backup.status,
      createdAt: backup.dataValues.created_at,
      notes: backup.notes
    }));

    res.json({
      backups: backupsWithSize,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backup statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await BackupService.getBackupStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching backup stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monitoring dashboard data
router.get('/monitoring', async (req, res) => {
  try {
    const dashboardData = await BackupMonitoringService.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual backup
router.post('/create', validateBackupCreation, handleValidationErrors, async (req, res) => {
  try {
    const { notes, compress, encrypt, encryptionKey } = req.body;
    
    const result = await BackupService.createBackup({
      type: 'manual',
      notes: notes || '',
      compress: compress !== undefined ? compress : true,
      encrypt: encrypt || false,
      encryptionKey: encryptionKey || null
    });

    res.status(201).json({
      message: 'Backup created successfully',
      backup: result.backup,
      duration: result.duration
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify backup integrity
router.post('/:backupId/verify', async (req, res) => {
  try {
    const { backupId } = req.params;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (!backup.checksum) {
      return res.status(400).json({ error: 'No checksum available for this backup' });
    }

    const isValid = await BackupService.verifyBackupIntegrity(backup.filePath, backup.checksum);
    
    res.json({
      valid: isValid,
      checksum: backup.checksum,
      message: isValid ? 'Backup integrity verified' : 'Backup integrity check failed'
    });
  } catch (error) {
    console.error('Error verifying backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete the file if it exists
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // Delete the record
    await backup.destroy();

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download backup file
router.get('/:backupId/download', async (req, res) => {
  try {
    const { backupId } = req.params;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Check if file exists
    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(backup.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming backup file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading backup file' });
      }
    });

  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/:backupId/restore', async (req, res) => {
  try {
    const { backupId } = req.params;
    const { encryptionKey } = req.body;

    const result = await BackupService.restoreBackup(backupId, encryptionKey);
    res.json(result);
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule backup
router.post('/schedule', async (req, res) => {
  try {
    const { type, scheduleTime, cronExpression, options = {} } = req.body;

    let jobName;
    if (type === 'one-time' && scheduleTime) {
      const scheduleDate = new Date(scheduleTime);
      jobName = await BackupScheduler.scheduleOneTimeBackup(scheduleDate, options);
    } else if (type === 'recurring' && cronExpression) {
      jobName = await BackupScheduler.scheduleCustomBackup(cronExpression, options);
    } else {
      return res.status(400).json({ error: 'Invalid schedule parameters' });
    }

    res.json({
      message: 'Backup scheduled successfully',
      jobName: jobName,
      type: type
    });
  } catch (error) {
    console.error('Error scheduling backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel scheduled backup
router.delete('/schedule/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    const cancelled = BackupScheduler.cancelJob(jobName);

    if (cancelled) {
      res.json({ message: 'Scheduled backup cancelled successfully' });
    } else {
      res.status(404).json({ error: 'Scheduled job not found' });
    }
  } catch (error) {
    console.error('Error cancelling scheduled backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduled jobs
router.get('/schedule', async (req, res) => {
  try {
    const jobs = BackupScheduler.getScheduledJobs();
    const status = BackupScheduler.getStatus();
    
    res.json({
      jobs: jobs,
      status: status
    });
  } catch (error) {
    console.error('Error fetching scheduled jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload backup to cloud storage
router.post('/:backupId/upload-cloud', async (req, res) => {
  try {
    const { backupId } = req.params;
    const { provider } = req.body;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const result = await CloudStorageService.uploadBackup(
      backup.filePath,
      backup.fileName,
      provider,
      {
        backupType: backup.backupType,
        encryption: backup.isEncrypted
      }
    );

    res.json({
      message: 'Backup uploaded to cloud storage successfully',
      result: result
    });
  } catch (error) {
    console.error('Error uploading backup to cloud:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download backup from cloud storage
router.post('/:backupId/download-cloud', async (req, res) => {
  try {
    const { backupId } = req.params;
    const { provider, localPath } = req.body;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const result = await CloudStorageService.downloadBackup(
      backup.fileName,
      provider,
      localPath || path.join(process.cwd(), 'downloads', backup.fileName)
    );

    res.json({
      message: 'Backup downloaded from cloud storage successfully',
      result: result
    });
  } catch (error) {
    console.error('Error downloading backup from cloud:', error);
    res.status(500).json({ error: error.message });
  }
});

// List cloud backups
router.get('/cloud/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { prefix, maxResults } = req.query;

    const backups = await CloudStorageService.listBackups(provider, {
      prefix: prefix || 'myfinance_backup_',
      maxResults: maxResults ? parseInt(maxResults) : 100
    });

    res.json({
      provider: provider,
      backups: backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Error listing cloud backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await BackupMonitoringService.performHealthCheck();
    res.json(healthCheck);
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;