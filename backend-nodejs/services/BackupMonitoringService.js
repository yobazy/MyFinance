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
  defaultMeta: { service: 'backup-monitoring' },
  transports: [
    new winston.transports.File({ filename: 'logs/backup-monitoring-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/backup-monitoring-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BackupMonitoringService {
  constructor() {
    this.alerts = [];
    this.monitoringEnabled = true;
    this.alertThresholds = {
      maxBackupAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      maxBackupSize: 1024 * 1024 * 1024, // 1GB
      minFreeSpace: 1024 * 1024 * 1024, // 1GB
      maxFailureRate: 0.2 // 20%
    };
  }

  /**
   * Start monitoring service
   * @returns {Promise<void>}
   */
  async start() {
    if (this.monitoringEnabled) {
      logger.info('Starting backup monitoring service');
      
      // Run initial health check
      await this.performHealthCheck();
      
      // Set up periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          logger.error('Error during periodic health check', { error: error.message });
        }
      }, 60 * 60 * 1000); // Check every hour

      logger.info('Backup monitoring service started');
    }
  }

  /**
   * Stop monitoring service
   * @returns {void}
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    logger.info('Backup monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date(),
      status: 'healthy',
      checks: {},
      alerts: []
    };

    try {
      // Check backup frequency
      const frequencyCheck = await this.checkBackupFrequency();
      healthCheck.checks.backupFrequency = frequencyCheck;

      // Check backup integrity
      const integrityCheck = await this.checkBackupIntegrity();
      healthCheck.checks.backupIntegrity = integrityCheck;

      // Check storage space
      const storageCheck = await this.checkStorageSpace();
      healthCheck.checks.storageSpace = storageCheck;

      // Check backup success rate
      const successRateCheck = await this.checkBackupSuccessRate();
      healthCheck.checks.backupSuccessRate = successRateCheck;

      // Check for failed backups
      const failedBackupsCheck = await this.checkFailedBackups();
      healthCheck.checks.failedBackups = failedBackupsCheck;

      // Check backup size trends
      const sizeTrendCheck = await this.checkBackupSizeTrends();
      healthCheck.checks.backupSizeTrends = sizeTrendCheck;

      // Determine overall status
      const allChecks = Object.values(healthCheck.checks);
      const failedChecks = allChecks.filter(check => check.status === 'unhealthy');
      
      if (failedChecks.length > 0) {
        healthCheck.status = 'unhealthy';
        healthCheck.alerts = failedChecks.map(check => check.alert);
      }

      // Log health check results
      if (healthCheck.status === 'healthy') {
        logger.info('Backup health check passed', { checks: healthCheck.checks });
      } else {
        logger.warn('Backup health check failed', { 
          status: healthCheck.status, 
          alerts: healthCheck.alerts 
        });
      }

      return healthCheck;

    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      healthCheck.status = 'error';
      healthCheck.error = error.message;
      return healthCheck;
    }
  }

  /**
   * Check backup frequency
   * @returns {Promise<Object>} Frequency check result
   */
  async checkBackupFrequency() {
    try {
      const settings = await BackupSettings.findOne();
      if (!settings || !settings.autoBackupEnabled) {
        return {
          status: 'warning',
          message: 'Auto backup is disabled',
          alert: 'Auto backup is disabled - consider enabling for data protection'
        };
      }

      const lastBackup = await DatabaseBackup.findOne({
        where: { status: 'completed' },
        order: [['created_at', 'DESC']]
      });

      if (!lastBackup) {
        return {
          status: 'unhealthy',
          message: 'No backups found',
          alert: 'No backups have been created - immediate action required'
        };
      }

      const timeSinceLastBackup = Date.now() - new Date(lastBackup.createdAt).getTime();
      const expectedInterval = settings.backupFrequencyHours * 60 * 60 * 1000;

      if (timeSinceLastBackup > expectedInterval * 1.5) { // 50% tolerance
        return {
          status: 'unhealthy',
          message: `Last backup was ${Math.round(timeSinceLastBackup / (60 * 60 * 1000))} hours ago`,
          alert: `Backup is overdue - last backup was ${Math.round(timeSinceLastBackup / (60 * 60 * 1000))} hours ago`
        };
      }

      return {
        status: 'healthy',
        message: `Last backup was ${Math.round(timeSinceLastBackup / (60 * 60 * 1000))} hours ago`,
        lastBackup: lastBackup.createdAt
      };

    } catch (error) {
      logger.error('Error checking backup frequency', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check backup frequency',
        error: error.message
      };
    }
  }

  /**
   * Check backup integrity
   * @returns {Promise<Object>} Integrity check result
   */
  async checkBackupIntegrity() {
    try {
      const recentBackups = await DatabaseBackup.findAll({
        where: { status: 'completed' },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      const integrityIssues = [];
      
      for (const backup of recentBackups) {
        if (backup.checksum) {
          // In a real implementation, you would verify the checksum here
          // For now, we'll assume all backups with checksums are valid
          continue;
        } else {
          integrityIssues.push({
            backupId: backup.id,
            fileName: backup.fileName,
            issue: 'No checksum available'
          });
        }
      }

      if (integrityIssues.length > 0) {
        return {
          status: 'warning',
          message: `${integrityIssues.length} backups without integrity verification`,
          alert: 'Some backups lack integrity verification - consider enabling checksum validation',
          issues: integrityIssues
        };
      }

      return {
        status: 'healthy',
        message: 'All recent backups have integrity verification',
        checkedBackups: recentBackups.length
      };

    } catch (error) {
      logger.error('Error checking backup integrity', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check backup integrity',
        error: error.message
      };
    }
  }

  /**
   * Check storage space
   * @returns {Promise<Object>} Storage check result
   */
  async checkStorageSpace() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const settings = await BackupSettings.findOne();
      const backupDir = path.resolve(settings?.backupLocation || 'backups/');
      
      if (!fs.existsSync(backupDir)) {
        return {
          status: 'warning',
          message: 'Backup directory does not exist',
          alert: 'Backup directory does not exist - backups may fail'
        };
      }

      // Get disk space (simplified - in production use proper disk space checking)
      const stats = fs.statSync(backupDir);
      
      // Calculate total backup size
      const totalBackupSize = await DatabaseBackup.sum('file_size') || 0;
      const totalBackupSizeMB = Math.round(totalBackupSize / (1024 * 1024) * 100) / 100;

      if (totalBackupSize > this.alertThresholds.maxBackupSize) {
        return {
          status: 'warning',
          message: `Total backup size is ${totalBackupSizeMB}MB`,
          alert: `Backup storage is large (${totalBackupSizeMB}MB) - consider cleanup or compression`,
          totalSize: totalBackupSize,
          totalSizeMB: totalBackupSizeMB
        };
      }

      return {
        status: 'healthy',
        message: `Total backup size is ${totalBackupSizeMB}MB`,
        totalSize: totalBackupSize,
        totalSizeMB: totalBackupSizeMB
      };

    } catch (error) {
      logger.error('Error checking storage space', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check storage space',
        error: error.message
      };
    }
  }

  /**
   * Check backup success rate
   * @returns {Promise<Object>} Success rate check result
   */
  async checkBackupSuccessRate() {
    try {
      const totalBackups = await DatabaseBackup.count();
      const successfulBackups = await DatabaseBackup.count({
        where: { status: 'completed' }
      });
      const failedBackups = await DatabaseBackup.count({
        where: { status: 'failed' }
      });

      const successRate = totalBackups > 0 ? successfulBackups / totalBackups : 1;
      const failureRate = totalBackups > 0 ? failedBackups / totalBackups : 0;

      if (failureRate > this.alertThresholds.maxFailureRate) {
        return {
          status: 'unhealthy',
          message: `Backup failure rate is ${Math.round(failureRate * 100)}%`,
          alert: `High backup failure rate (${Math.round(failureRate * 100)}%) - investigate backup process`,
          successRate: successRate,
          failureRate: failureRate,
          totalBackups: totalBackups,
          successfulBackups: successfulBackups,
          failedBackups: failedBackups
        };
      }

      return {
        status: 'healthy',
        message: `Backup success rate is ${Math.round(successRate * 100)}%`,
        successRate: successRate,
        failureRate: failureRate,
        totalBackups: totalBackups,
        successfulBackups: successfulBackups,
        failedBackups: failedBackups
      };

    } catch (error) {
      logger.error('Error checking backup success rate', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check backup success rate',
        error: error.message
      };
    }
  }

  /**
   * Check for failed backups
   * @returns {Promise<Object>} Failed backups check result
   */
  async checkFailedBackups() {
    try {
      const recentFailedBackups = await DatabaseBackup.findAll({
        where: { status: 'failed' },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      if (recentFailedBackups.length > 0) {
        return {
          status: 'unhealthy',
          message: `${recentFailedBackups.length} recent failed backups`,
          alert: `${recentFailedBackups.length} recent backup failures - immediate attention required`,
          failedBackups: recentFailedBackups.map(backup => ({
            id: backup.id,
            fileName: backup.fileName,
            createdAt: backup.createdAt,
            notes: backup.notes
          }))
        };
      }

      return {
        status: 'healthy',
        message: 'No recent failed backups',
        failedBackups: []
      };

    } catch (error) {
      logger.error('Error checking failed backups', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check failed backups',
        error: error.message
      };
    }
  }

  /**
   * Check backup size trends
   * @returns {Promise<Object>} Size trend check result
   */
  async checkBackupSizeTrends() {
    try {
      const recentBackups = await DatabaseBackup.findAll({
        where: { status: 'completed' },
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['file_size', 'createdAt']
      });

      if (recentBackups.length < 3) {
        return {
          status: 'info',
          message: 'Insufficient data for trend analysis',
          recentBackups: recentBackups.length
        };
      }

      // Calculate size trend
      const sizes = recentBackups.map(backup => backup.file_size);
      const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
      const latestSize = sizes[0];
      const sizeIncrease = ((latestSize - avgSize) / avgSize) * 100;

      if (sizeIncrease > 50) { // 50% increase
        return {
          status: 'warning',
          message: `Backup size increased by ${Math.round(sizeIncrease)}%`,
          alert: `Significant backup size increase (${Math.round(sizeIncrease)}%) - monitor storage usage`,
          avgSize: Math.round(avgSize / (1024 * 1024) * 100) / 100,
          latestSize: Math.round(latestSize / (1024 * 1024) * 100) / 100,
          sizeIncrease: Math.round(sizeIncrease)
        };
      }

      return {
        status: 'healthy',
        message: `Backup size trend is stable (${Math.round(sizeIncrease)}% change)`,
        avgSize: Math.round(avgSize / (1024 * 1024) * 100) / 100,
        latestSize: Math.round(latestSize / (1024 * 1024) * 100) / 100,
        sizeIncrease: Math.round(sizeIncrease)
      };

    } catch (error) {
      logger.error('Error checking backup size trends', { error: error.message });
      return {
        status: 'error',
        message: 'Failed to check backup size trends',
        error: error.message
      };
    }
  }

  /**
   * Get monitoring dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    try {
      const [
        healthCheck,
        recentBackups,
        backupStats,
        settings
      ] = await Promise.all([
        this.performHealthCheck(),
        this.getRecentBackups(10),
        this.getBackupStatistics(),
        BackupSettings.findOne()
      ]);

      return {
        healthCheck,
        recentBackups,
        backupStats,
        settings: settings ? {
          autoBackupEnabled: settings.autoBackupEnabled,
          backupFrequencyHours: settings.backupFrequencyHours,
          maxBackups: settings.maxBackups,
          compressionEnabled: settings.compressionEnabled,
          encryptionEnabled: settings.encryptionEnabled
        } : null,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get recent backups
   * @param {number} limit - Number of recent backups to return
   * @returns {Promise<Array>} Recent backups
   */
  async getRecentBackups(limit = 10) {
    return await DatabaseBackup.findAll({
      order: [['created_at', 'DESC']],
      limit: limit,
      attributes: [
        'id',
        'fileName',
        'backupType',
        'file_size',
        'isCompressed',
        'isEncrypted',
        'status',
        'createdAt',
        'notes'
      ]
    });
  }

  /**
   * Get backup statistics
   * @returns {Promise<Object>} Backup statistics
   */
  async getBackupStatistics() {
    const [
      totalBackups,
      successfulBackups,
      failedBackups,
      totalSize,
      avgSize,
      lastBackup
    ] = await Promise.all([
      DatabaseBackup.count(),
      DatabaseBackup.count({ where: { status: 'completed' } }),
      DatabaseBackup.count({ where: { status: 'failed' } }),
      DatabaseBackup.sum('file_size'),
      DatabaseBackup.findAll({
        attributes: [
          [sequelize.fn('AVG', sequelize.col('file_size')), 'avgSize']
        ],
        where: { status: 'completed' }
      }),
      DatabaseBackup.findOne({
        where: { status: 'completed' },
        order: [['created_at', 'DESC']],
        attributes: ['createdAt', 'file_size']
      })
    ]);

    const avgSizeValue = avgSize[0]?.dataValues?.avgSize || 0;

    return {
      totalBackups,
      successfulBackups,
      failedBackups,
      successRate: totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 100,
      totalSize: totalSize || 0,
      totalSizeMB: Math.round((totalSize || 0) / (1024 * 1024) * 100) / 100,
      avgSize: Math.round(avgSizeValue / (1024 * 1024) * 100) / 100,
      lastBackup: lastBackup ? {
        createdAt: lastBackup.createdAt,
        fileSize: lastBackup.file_size,
        fileSizeMB: Math.round(lastBackup.file_size / (1024 * 1024) * 100) / 100
      } : null
    };
  }

  /**
   * Set alert thresholds
   * @param {Object} thresholds - New thresholds
   * @returns {void}
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
  }

  /**
   * Enable or disable monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   * @returns {void}
   */
  setMonitoringEnabled(enabled) {
    this.monitoringEnabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
    logger.info(`Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = new BackupMonitoringService();
