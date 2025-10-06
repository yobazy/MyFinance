const cron = require('node-cron');
const winston = require('winston');
const BackupService = require('./BackupService');
const { BackupSettings } = require('../models');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'backup-scheduler' },
  transports: [
    new winston.transports.File({ filename: 'logs/backup-scheduler-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/backup-scheduler-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BackupScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start the backup scheduler
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    try {
      logger.info('Starting backup scheduler');
      
      // Load backup settings
      const settings = await this.getBackupSettings();
      
      if (settings.autoBackupEnabled) {
        await this.scheduleAutoBackup(settings);
      }

      this.isRunning = true;
      logger.info('Backup scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start backup scheduler', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the backup scheduler
   * @returns {void}
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Backup scheduler is not running');
      return;
    }

    logger.info('Stopping backup scheduler');
    
    // Stop all scheduled jobs
    for (const [jobName, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${jobName}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    logger.info('Backup scheduler stopped');
  }

  /**
   * Schedule automatic backups based on frequency
   * @param {Object} settings - Backup settings
   * @returns {Promise<void>}
   */
  async scheduleAutoBackup(settings) {
    const frequencyHours = settings.backupFrequencyHours || 24;
    
    // Convert hours to cron expression
    const cronExpression = this.hoursToCronExpression(frequencyHours);
    
    logger.info(`Scheduling auto backup every ${frequencyHours} hours (${cronExpression})`);

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled backup');
        
        const result = await BackupService.createBackup({
          type: 'scheduled',
          notes: 'Automated scheduled backup',
          compress: settings.compressionEnabled,
          encrypt: settings.encryptionEnabled,
          encryptionKey: settings.encryptionKey
        });

        logger.info('Scheduled backup completed successfully', {
          backupId: result.backup.id,
          fileName: result.backup.fileName,
          fileSize: result.backup.fileSize
        });

      } catch (error) {
        logger.error('Scheduled backup failed', { error: error.message });
        
        // Create a failed backup record for monitoring
        try {
          const { DatabaseBackup } = require('../models');
          await DatabaseBackup.create({
            fileName: `failed_backup_${new Date().toISOString()}`,
            backupType: 'scheduled',
            filePath: '',
            fileSize: 0,
            isCompressed: false,
            isEncrypted: false,
            status: 'failed',
            notes: `Scheduled backup failed: ${error.message}`
          });
        } catch (recordError) {
          logger.error('Failed to create failed backup record', { error: recordError.message });
        }
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('auto-backup', job);
    job.start();
  }

  /**
   * Convert hours to cron expression
   * @param {number} hours - Number of hours
   * @returns {string} Cron expression
   */
  hoursToCronExpression(hours) {
    if (hours < 1) {
      // Every minute (for testing)
      return '* * * * *';
    } else if (hours === 1) {
      // Every hour at minute 0
      return '0 * * * *';
    } else if (hours < 24) {
      // Every N hours at minute 0
      return `0 */${hours} * * *`;
    } else if (hours === 24) {
      // Daily at midnight
      return '0 0 * * *';
    } else {
      // Every N days at midnight
      const days = Math.floor(hours / 24);
      return `0 0 */${days} * *`;
    }
  }

  /**
   * Schedule a one-time backup
   * @param {Date} scheduleTime - When to run the backup
   * @param {Object} options - Backup options
   * @returns {Promise<string>} Job name
   */
  async scheduleOneTimeBackup(scheduleTime, options = {}) {
    const jobName = `one-time-${Date.now()}`;
    const delay = scheduleTime.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Schedule time must be in the future');
    }

    logger.info(`Scheduling one-time backup for ${scheduleTime.toISOString()}`);

    const timeoutId = setTimeout(async () => {
      try {
        logger.info(`Starting one-time backup: ${jobName}`);
        
        const result = await BackupService.createBackup({
          type: 'scheduled',
          ...options
        });

        logger.info(`One-time backup completed: ${jobName}`, {
          backupId: result.backup.id,
          fileName: result.backup.fileName
        });

      } catch (error) {
        logger.error(`One-time backup failed: ${jobName}`, { error: error.message });
      } finally {
        this.jobs.delete(jobName);
      }
    }, delay);

    this.jobs.set(jobName, { stop: () => clearTimeout(timeoutId) });
    return jobName;
  }

  /**
   * Schedule backup at specific times
   * @param {string} cronExpression - Cron expression
   * @param {Object} options - Backup options
   * @returns {Promise<string>} Job name
   */
  async scheduleCustomBackup(cronExpression, options = {}) {
    const jobName = `custom-${Date.now()}`;

    logger.info(`Scheduling custom backup with cron: ${cronExpression}`);

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info(`Starting custom backup: ${jobName}`);
        
        const result = await BackupService.createBackup({
          type: 'scheduled',
          ...options
        });

        logger.info(`Custom backup completed: ${jobName}`, {
          backupId: result.backup.id,
          fileName: result.backup.fileName
        });

      } catch (error) {
        logger.error(`Custom backup failed: ${jobName}`, { error: error.message });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set(jobName, job);
    job.start();
    return jobName;
  }

  /**
   * Cancel a scheduled job
   * @param {string} jobName - Job name to cancel
   * @returns {boolean} Whether job was cancelled
   */
  cancelJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      logger.info(`Cancelled job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   * @returns {Array} List of job names
   */
  getScheduledJobs() {
    return Array.from(this.jobs.keys());
  }

  /**
   * Update backup schedule based on new settings
   * @param {Object} settings - New backup settings
   * @returns {Promise<void>}
   */
  async updateSchedule(settings) {
    logger.info('Updating backup schedule');

    // Stop existing auto backup job
    if (this.jobs.has('auto-backup')) {
      this.jobs.get('auto-backup').stop();
      this.jobs.delete('auto-backup');
    }

    // Start new schedule if auto backup is enabled
    if (settings.autoBackupEnabled) {
      await this.scheduleAutoBackup(settings);
    }

    logger.info('Backup schedule updated');
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
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobs: this.getScheduledJobs(),
      jobCount: this.jobs.size
    };
  }
}

module.exports = new BackupScheduler();
