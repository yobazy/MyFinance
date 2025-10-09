const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const archiver = require('archiver');
const winston = require('winston');
const { DatabaseBackup, BackupSettings } = require('../models');
const { sequelize } = require('../config/database');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'backup-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/backup-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/backup-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BackupService {
  constructor() {
    this.isBackupInProgress = false;
    this.backupQueue = [];
  }

  /**
   * Create a backup with proper compression and validation
   * @param {Object} options - Backup options
   * @param {string} options.type - 'auto', 'manual', or 'scheduled'
   * @param {string} options.notes - Optional notes
   * @param {boolean} options.compress - Whether to compress the backup
   * @param {boolean} options.encrypt - Whether to encrypt the backup
   * @param {string} options.encryptionKey - Key for encryption
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(options = {}) {
    const {
      type = 'manual',
      notes = '',
      compress = true,
      encrypt = false,
      encryptionKey = null
    } = options;

    // Prevent concurrent backups
    if (this.isBackupInProgress) {
      logger.warn('Backup already in progress, queuing request');
      return new Promise((resolve, reject) => {
        this.backupQueue.push({ options, resolve, reject });
      });
    }

    this.isBackupInProgress = true;
    const startTime = Date.now();

    try {
      logger.info(`Starting ${type} backup process`);

      // Get backup settings
      const settings = await this.getBackupSettings();
      
      // Ensure backup directory exists
      const backupDir = path.resolve(settings.backupLocation);
      await this.ensureDirectoryExists(backupDir);

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseFileName = `myfinance_backup_${timestamp}`;
      const extension = compress ? '.db.gz' : '.db';
      const fileName = `${baseFileName}${extension}`;
      const filePath = path.join(backupDir, fileName);

      // Create backup
      const backupResult = await this.performBackup(filePath, {
        compress,
        encrypt,
        encryptionKey
      });

      // Calculate checksum for integrity validation
      const checksum = await this.calculateChecksum(filePath);

      // Create backup record
      const backup = await DatabaseBackup.create({
        fileName: fileName,
        backupType: type,
        filePath: filePath,
        fileSize: backupResult.size,
        isCompressed: compress,
        isEncrypted: encrypt,
        checksum: checksum,
        notes: notes,
        status: 'completed'
      });

      // Update settings with last backup time
      await this.updateLastBackupTime(settings);

      // Clean up old backups
      await this.cleanupOldBackups(settings);

      const duration = Date.now() - startTime;
      logger.info(`Backup completed successfully in ${duration}ms`, {
        backupId: backup.id,
        fileName: fileName,
        fileSize: backupResult.size,
        checksum: checksum
      });

      // Process queued backups
      this.processBackupQueue();

      return {
        success: true,
        backup: {
          id: backup.id,
          fileName: fileName,
          filePath: filePath,
          fileSize: backupResult.size,
          fileSizeMb: Math.round(backupResult.size / (1024 * 1024) * 100) / 100,
          checksum: checksum,
          isCompressed: compress,
          isEncrypted: encrypt,
          createdAt: backup.createdAt,
          notes: notes,
          status: 'completed'
        },
        duration: duration
      };

    } catch (error) {
      logger.error('Backup creation failed', { error: error.message, stack: error.stack });
      
      // Process queued backups even if current one failed
      this.processBackupQueue();
      
      throw new Error(`Backup creation failed: ${error.message}`);
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Perform the actual backup operation
   * @param {string} filePath - Target file path
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result with size
   */
  async performBackup(filePath, options = {}) {
    const { compress, encrypt, encryptionKey } = options;
    const dbPath = path.resolve('db.sqlite3');

    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found');
    }

    if (compress) {
      return await this.createCompressedBackup(dbPath, filePath, encrypt, encryptionKey);
    } else {
      return await this.createUncompressedBackup(dbPath, filePath, encrypt, encryptionKey);
    }
  }

  /**
   * Create a compressed backup
   * @param {string} sourcePath - Source database path
   * @param {string} targetPath - Target backup path
   * @param {boolean} encrypt - Whether to encrypt
   * @param {string} encryptionKey - Encryption key
   * @returns {Promise<Object>} Backup result
   */
  async createCompressedBackup(sourcePath, targetPath, encrypt = false, encryptionKey = null) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);
      const gzipStream = zlib.createGzip({ level: 9 }); // Maximum compression

      let stream = readStream.pipe(gzipStream);

      // Add encryption if requested
      if (encrypt && encryptionKey) {
        // Use modern crypto API - create key from password
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        stream = stream.pipe(cipher);
      }

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        const stats = fs.statSync(targetPath);
        resolve({ size: stats.size });
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

      readStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Create an uncompressed backup
   * @param {string} sourcePath - Source database path
   * @param {string} targetPath - Target backup path
   * @param {boolean} encrypt - Whether to encrypt
   * @param {string} encryptionKey - Encryption key
   * @returns {Promise<Object>} Backup result
   */
  async createUncompressedBackup(sourcePath, targetPath, encrypt = false, encryptionKey = null) {
    if (encrypt && encryptionKey) {
      return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(targetPath);
        // Use modern crypto API - create key from password
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        readStream.pipe(cipher).pipe(writeStream);

        writeStream.on('finish', () => {
          const stats = fs.statSync(targetPath);
          resolve({ size: stats.size });
        });

        writeStream.on('error', reject);
        readStream.on('error', reject);
      });
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      const stats = fs.statSync(targetPath);
      return { size: stats.size };
    }
  }

  /**
   * Calculate checksum for file integrity validation
   * @param {string} filePath - File path
   * @returns {Promise<string>} SHA256 checksum
   */
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verify backup integrity using checksum
   * @param {string} filePath - Backup file path
   * @param {string} expectedChecksum - Expected checksum
   * @returns {Promise<boolean>} Whether backup is valid
   */
  async verifyBackupIntegrity(filePath, expectedChecksum) {
    try {
      const actualChecksum = await this.calculateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      logger.error('Failed to verify backup integrity', { error: error.message });
      return false;
    }
  }

  /**
   * Restore database from backup
   * @param {number} backupId - Backup ID
   * @param {string} encryptionKey - Decryption key if encrypted
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupId, encryptionKey = null) {
    try {
      logger.info(`Starting restore from backup ${backupId}`);

      const backup = await DatabaseBackup.findByPk(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      if (!fs.existsSync(backup.filePath)) {
        throw new Error('Backup file not found');
      }

      // Verify backup integrity
      if (backup.checksum) {
        const isValid = await this.verifyBackupIntegrity(backup.filePath, backup.checksum);
        if (!isValid) {
          throw new Error('Backup file integrity check failed');
        }
      }

      // Create temporary restore file
      const tempRestorePath = path.join(path.dirname(backup.filePath), `temp_restore_${Date.now()}.db`);
      
      try {
        // Handle compressed backups
        if (backup.isCompressed) {
          await this.decompressBackup(backup.filePath, tempRestorePath, backup.isEncrypted, encryptionKey);
        } else if (backup.isEncrypted) {
          await this.decryptBackup(backup.filePath, tempRestorePath, encryptionKey);
        } else {
          fs.copyFileSync(backup.filePath, tempRestorePath);
        }

        // Close current database connection gracefully
        try {
          await sequelize.close();
        } catch (closeError) {
          logger.warn('Error closing database connection:', closeError.message);
        }

        // Replace current database with backup
        const dbPath = path.resolve('db.sqlite3');
        fs.copyFileSync(tempRestorePath, dbPath);

        // Wait a moment for file system to sync
        await new Promise(resolve => setTimeout(resolve, 100));

        // Reconnect to database
        try {
          await sequelize.authenticate();
        } catch (authError) {
          // If authentication fails, try to recreate the connection
          logger.warn('Authentication failed, recreating connection:', authError.message);
          
          // Import the database config and recreate the connection
          const { Sequelize } = require('sequelize');
          const path = require('path');
          
          const newSequelize = new Sequelize({
            dialect: 'sqlite',
            storage: dbPath,
            logging: false,
            define: {
              timestamps: true,
              underscored: true,
              freezeTableName: true
            }
          });
          
          await newSequelize.authenticate();
          
          // Replace the global sequelize instance
          Object.setPrototypeOf(sequelize, Object.getPrototypeOf(newSequelize));
          Object.assign(sequelize, newSequelize);
        }

        // Clean up temporary file
        fs.unlinkSync(tempRestorePath);

        logger.info(`Database restored successfully from backup ${backupId}`);
        return { success: true, message: 'Database restored successfully' };

      } catch (error) {
        // Clean up temporary file on error
        if (fs.existsSync(tempRestorePath)) {
          fs.unlinkSync(tempRestorePath);
        }
        throw error;
      }

    } catch (error) {
      logger.error('Backup restore failed', { error: error.message, backupId });
      throw new Error(`Backup restore failed: ${error.message}`);
    }
  }

  /**
   * Decompress backup file
   * @param {string} sourcePath - Compressed file path
   * @param {string} targetPath - Decompressed file path
   * @param {boolean} isEncrypted - Whether file is encrypted
   * @param {string} encryptionKey - Decryption key
   * @returns {Promise<void>}
   */
  async decompressBackup(sourcePath, targetPath, isEncrypted = false, encryptionKey = null) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);
      const gunzipStream = zlib.createGunzip();

      let stream = readStream;

      // Add decryption if needed
      if (isEncrypted && encryptionKey) {
        const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
        stream = stream.pipe(decipher);
      }

      stream.pipe(gunzipStream).pipe(writeStream);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  }

  /**
   * Decrypt backup file
   * @param {string} sourcePath - Encrypted file path
   * @param {string} targetPath - Decrypted file path
   * @param {string} encryptionKey - Decryption key
   * @returns {Promise<void>}
   */
  async decryptBackup(sourcePath, targetPath, encryptionKey) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);

      readStream.pipe(decipher).pipe(writeStream);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  }

  /**
   * Get backup settings
   * @returns {Promise<Object>} Backup settings
   */
  async getBackupSettings() {
    let settings = await BackupSettings.findOne();
    
    if (!settings) {
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

    return settings;
  }

  /**
   * Update last backup time
   * @param {Object} settings - Backup settings
   * @returns {Promise<void>}
   */
  async updateLastBackupTime(settings) {
    settings.lastBackup = new Date();
    await settings.save();
  }

  /**
   * Clean up old backups based on retention policies
   * @param {Object} settings - Backup settings
   * @returns {Promise<void>}
   */
  async cleanupOldBackups(settings) {
    try {
      const backups = await DatabaseBackup.findAll({
        order: [['created_at', 'DESC']]
      });

      // Count-based cleanup
      if (backups.length > settings.maxBackups) {
        const backupsToDelete = backups.slice(settings.maxBackups);
        await this.deleteBackups(backupsToDelete);
      }

      // Time-based cleanup
      if (settings.retentionDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);
        
        const oldBackups = backups.filter(backup => 
          new Date(backup.createdAt) < cutoffDate
        );
        
        if (oldBackups.length > 0) {
          await this.deleteBackups(oldBackups);
        }
      }

      // Size-based cleanup
      if (settings.maxBackupSize) {
        const totalSize = backups.reduce((sum, backup) => sum + backup.fileSize, 0);
        if (totalSize > settings.maxBackupSize) {
          // Delete oldest backups until under size limit
          const sortedBackups = backups.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const backupsToDelete = [];
          let currentSize = totalSize;
          
          for (const backup of sortedBackups) {
            if (currentSize <= settings.maxBackupSize) break;
            backupsToDelete.push(backup);
            currentSize -= backup.fileSize;
          }
          
          if (backupsToDelete.length > 0) {
            await this.deleteBackups(backupsToDelete);
          }
        }
      }

    } catch (error) {
      logger.error('Error cleaning up old backups', { error: error.message });
    }
  }

  /**
   * Delete multiple backups
   * @param {Array} backups - Array of backup objects
   * @returns {Promise<void>}
   */
  async deleteBackups(backups) {
    for (const backup of backups) {
      try {
        // Delete the file if it exists
        if (fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }
        
        // Delete the record
        await backup.destroy();
        
        logger.info(`Deleted old backup: ${backup.fileName}`);
      } catch (error) {
        logger.error(`Failed to delete backup ${backup.id}`, { error: error.message });
      }
    }
  }

  /**
   * Process queued backup requests
   * @returns {void}
   */
  processBackupQueue() {
    if (this.backupQueue.length > 0 && !this.isBackupInProgress) {
      const { options, resolve, reject } = this.backupQueue.shift();
      this.createBackup(options)
        .then(resolve)
        .catch(reject);
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created backup directory: ${dirPath}`);
      }
    } catch (error) {
      logger.error(`Failed to create backup directory: ${dirPath}`, { error: error.message });
      throw new Error(`Failed to create backup directory: ${error.message}`);
    }
  }

  /**
   * Get backup statistics
   * @returns {Promise<Object>} Backup statistics
   */
  async getBackupStats() {
    try {
      const totalBackups = await DatabaseBackup.count();
      const totalSize = await DatabaseBackup.sum('file_size') || 0;
      const lastBackup = await DatabaseBackup.findOne({
        order: [['created_at', 'DESC']],
        attributes: ['created_at', 'file_size', 'checksum', 'status']
      });

      const backupsByType = await DatabaseBackup.findAll({
        attributes: [
          'backupType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('file_size')), 'totalSize']
        ],
        group: ['backupType']
      });

      return {
        totalBackups,
        totalSize,
        totalSizeMb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        lastBackup: lastBackup ? {
          createdAt: lastBackup.created_at,
          fileSize: lastBackup.file_size,
          fileSizeMb: Math.round(lastBackup.file_size / (1024 * 1024) * 100) / 100,
          checksum: lastBackup.checksum,
          status: lastBackup.status
        } : null,
        backupsByType: backupsByType.map(item => ({
          type: item.backupType,
          count: parseInt(item.dataValues.count),
          totalSize: parseInt(item.dataValues.totalSize || 0),
          totalSizeMb: Math.round((item.dataValues.totalSize || 0) / (1024 * 1024) * 100) / 100
        }))
      };
    } catch (error) {
      logger.error('Error fetching backup stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new BackupService();
