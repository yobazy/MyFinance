const express = require('express');
const fs = require('fs');
const path = require('path');
const { BackupSettings, DatabaseBackup } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

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
        backupLocation: 'backups/'
      });
    }

    res.json({
      id: settings.id,
      maxBackups: settings.maxBackups,
      autoBackupEnabled: settings.autoBackupEnabled,
      backupFrequencyHours: settings.backupFrequencyHours,
      lastBackup: settings.lastBackup,
      backupLocation: settings.backupLocation
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update backup settings
router.put('/settings', async (req, res) => {
  try {
    const { maxBackups, autoBackupEnabled, backupFrequencyHours, backupLocation } = req.body;

    let settings = await BackupSettings.findOne();
    
    if (!settings) {
      settings = await BackupSettings.create({
        maxBackups: maxBackups || 5,
        autoBackupEnabled: autoBackupEnabled !== undefined ? autoBackupEnabled : true,
        backupFrequencyHours: backupFrequencyHours || 24,
        backupLocation: backupLocation || 'backups/'
      });
    } else {
      if (maxBackups !== undefined) settings.maxBackups = maxBackups;
      if (autoBackupEnabled !== undefined) settings.autoBackupEnabled = autoBackupEnabled;
      if (backupFrequencyHours !== undefined) settings.backupFrequencyHours = backupFrequencyHours;
      if (backupLocation !== undefined) settings.backupLocation = backupLocation;
      
      await settings.save();
    }

    res.json({
      id: settings.id,
      maxBackups: settings.maxBackups,
      autoBackupEnabled: settings.autoBackupEnabled,
      backupFrequencyHours: settings.backupFrequencyHours,
      lastBackup: settings.lastBackup,
      backupLocation: settings.backupLocation
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all backups
router.get('/', async (req, res) => {
  try {
    const backups = await DatabaseBackup.findAll({
      order: [['createdAt', 'DESC']]
    });

    const backupsWithSize = backups.map(backup => ({
      id: backup.id,
      backupType: backup.backupType,
      filePath: backup.filePath,
      fileSize: backup.fileSize,
      fileSizeMb: Math.round(backup.fileSize / (1024 * 1024) * 100) / 100,
      createdAt: backup.createdAt,
      isCompressed: backup.isCompressed,
      notes: backup.notes
    }));

    res.json(backupsWithSize);
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual backup
router.post('/create', async (req, res) => {
  try {
    const { notes } = req.body;
    
    // Get backup settings
    let settings = await BackupSettings.findOne();
    if (!settings) {
      settings = await BackupSettings.create({
        maxBackups: 5,
        autoBackupEnabled: true,
        backupFrequencyHours: 24,
        backupLocation: 'backups/'
      });
    }

    // Create backup directory if it doesn't exist
    const backupDir = path.resolve(settings.backupLocation);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `myfinance_backup_${timestamp}.db.gz`;
    const filePath = path.join(backupDir, filename);

    // Create backup using SQLite backup command
    const dbPath = path.resolve('db.sqlite3');
    
    // For now, we'll just copy the database file
    // In a production environment, you might want to use sqlite3 backup command
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, filePath.replace('.gz', ''));
      
      // Get file size
      const stats = fs.statSync(filePath.replace('.gz', ''));
      const fileSize = stats.size;

      // Create backup record
      const backup = await DatabaseBackup.create({
        backupType: 'manual',
        filePath: filePath.replace('.gz', ''),
        fileSize: fileSize,
        isCompressed: false,
        notes: notes || ''
      });

      // Update settings with last backup time
      settings.lastBackup = new Date();
      await settings.save();

      // Clean up old backups
      await cleanupOldBackups(settings);

      res.status(201).json({
        message: 'Backup created successfully',
        backup: {
          id: backup.id,
          backupType: backup.backupType,
          filePath: backup.filePath,
          fileSize: backup.fileSize,
          fileSizeMb: Math.round(backup.fileSize / (1024 * 1024) * 100) / 100,
          createdAt: backup.createdAt,
          isCompressed: backup.isCompressed,
          notes: backup.notes
        }
      });
    } else {
      res.status(404).json({ error: 'Database file not found' });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
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

// Restore from backup
router.post('/:backupId/restore', async (req, res) => {
  try {
    const { backupId } = req.params;

    const backup = await DatabaseBackup.findByPk(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Close current database connection
    await sequelize.close();

    // Copy backup file to current database location
    const dbPath = path.resolve('db.sqlite3');
    fs.copyFileSync(backup.filePath, dbPath);

    // Reconnect to database
    await sequelize.authenticate();

    res.json({ message: 'Database restored successfully from backup' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to clean up old backups
async function cleanupOldBackups(settings) {
  try {
    const backups = await DatabaseBackup.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (backups.length > settings.maxBackups) {
      const backupsToDelete = backups.slice(settings.maxBackups);
      
      for (const backup of backupsToDelete) {
        // Delete the file if it exists
        if (fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }
        
        // Delete the record
        await backup.destroy();
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

module.exports = router;
