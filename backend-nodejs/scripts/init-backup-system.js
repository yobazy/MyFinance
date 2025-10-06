#!/usr/bin/env node

/**
 * Backup System Initialization Script
 * 
 * This script initializes the enhanced backup system with all services
 * and performs initial setup and health checks.
 */

const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Import services
const BackupService = require('../services/BackupService');
const BackupScheduler = require('../services/BackupScheduler');
const CloudStorageService = require('../services/CloudStorageService');
const BackupMonitoringService = require('../services/BackupMonitoringService');
const { BackupSettings } = require('../models');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class BackupSystemInitializer {
  constructor() {
    this.initialized = false;
    this.services = {
      backup: null,
      scheduler: null,
      cloudStorage: null,
      monitoring: null
    };
  }

  /**
   * Initialize the backup system
   */
  async initialize() {
    try {
      logger.info('🚀 Initializing Enhanced Backup System...');

      // Step 1: Create necessary directories
      await this.createDirectories();

      // Step 2: Initialize database settings
      await this.initializeDatabaseSettings();

      // Step 3: Initialize cloud storage (if configured)
      await this.initializeCloudStorage();

      // Step 4: Start monitoring service
      await this.startMonitoringService();

      // Step 5: Start backup scheduler
      await this.startBackupScheduler();

      // Step 6: Perform initial health check
      await this.performHealthCheck();

      // Step 7: Create initial backup (if enabled)
      await this.createInitialBackup();

      this.initialized = true;
      logger.info('✅ Backup system initialized successfully!');

      // Display system status
      await this.displaySystemStatus();

    } catch (error) {
      logger.error('❌ Failed to initialize backup system:', error.message);
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    logger.info('📁 Creating necessary directories...');

    const directories = [
      'backups',
      'logs',
      'downloads',
      'temp'
    ];

    for (const dir of directories) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`   ✓ Created directory: ${dir}`);
      } else {
        logger.info(`   ✓ Directory exists: ${dir}`);
      }
    }
  }

  /**
   * Initialize database settings
   */
  async initializeDatabaseSettings() {
    logger.info('⚙️  Initializing database settings...');

    try {
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
          maxBackupSize: 1024 * 1024 * 1024, // 1GB
          cloudStorageEnabled: false
        });
        logger.info('   ✓ Created default backup settings');
      } else {
        logger.info('   ✓ Backup settings already exist');
      }

      // Display current settings
      logger.info('   📊 Current settings:');
      logger.info(`      - Max backups: ${settings.maxBackups}`);
      logger.info(`      - Auto backup: ${settings.autoBackupEnabled ? 'Enabled' : 'Disabled'}`);
      logger.info(`      - Frequency: ${settings.backupFrequencyHours} hours`);
      logger.info(`      - Compression: ${settings.compressionEnabled ? 'Enabled' : 'Disabled'}`);
      logger.info(`      - Encryption: ${settings.encryptionEnabled ? 'Enabled' : 'Disabled'}`);
      logger.info(`      - Retention: ${settings.retentionDays} days`);

    } catch (error) {
      logger.error('   ❌ Failed to initialize database settings:', error.message);
      throw error;
    }
  }

  /**
   * Initialize cloud storage service
   */
  async initializeCloudStorage() {
    logger.info('☁️  Initializing cloud storage...');

    try {
      const settings = await BackupSettings.findOne();
      
      if (settings && settings.cloudStorageEnabled && settings.cloudProvider) {
        // Load cloud configuration
        const cloudConfig = this.loadCloudConfig(settings.cloudProvider, settings.cloudConfig);
        
        if (cloudConfig) {
          await CloudStorageService.initialize(cloudConfig);
          this.services.cloudStorage = CloudStorageService;
          logger.info(`   ✓ Cloud storage initialized: ${settings.cloudProvider}`);
        } else {
          logger.warn('   ⚠️  Cloud storage enabled but configuration not found');
        }
      } else {
        logger.info('   ✓ Cloud storage disabled');
      }

    } catch (error) {
      logger.warn('   ⚠️  Cloud storage initialization failed:', error.message);
      // Don't throw error - cloud storage is optional
    }
  }

  /**
   * Load cloud configuration
   */
  loadCloudConfig(provider, config) {
    if (!config) return null;

    try {
      const parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
      return { [provider]: parsedConfig };
    } catch (error) {
      logger.warn(`   ⚠️  Failed to parse cloud config for ${provider}:`, error.message);
      return null;
    }
  }

  /**
   * Start monitoring service
   */
  async startMonitoringService() {
    logger.info('📊 Starting monitoring service...');

    try {
      await BackupMonitoringService.start();
      this.services.monitoring = BackupMonitoringService;
      logger.info('   ✓ Monitoring service started');

      // Set up monitoring alerts
      BackupMonitoringService.setAlertThresholds({
        maxBackupAge: 24 * 60 * 60 * 1000, // 24 hours
        maxBackupSize: 1024 * 1024 * 1024, // 1GB
        minFreeSpace: 1024 * 1024 * 1024, // 1GB
        maxFailureRate: 0.2 // 20%
      });

      logger.info('   ✓ Monitoring alerts configured');

    } catch (error) {
      logger.error('   ❌ Failed to start monitoring service:', error.message);
      throw error;
    }
  }

  /**
   * Start backup scheduler
   */
  async startBackupScheduler() {
    logger.info('⏰ Starting backup scheduler...');

    try {
      await BackupScheduler.start();
      this.services.scheduler = BackupScheduler;
      logger.info('   ✓ Backup scheduler started');

      // Display scheduled jobs
      const jobs = BackupScheduler.getScheduledJobs();
      if (jobs.length > 0) {
        logger.info(`   📅 Active scheduled jobs: ${jobs.join(', ')}`);
      } else {
        logger.info('   📅 No scheduled jobs active');
      }

    } catch (error) {
      logger.error('   ❌ Failed to start backup scheduler:', error.message);
      throw error;
    }
  }

  /**
   * Perform initial health check
   */
  async performHealthCheck() {
    logger.info('🏥 Performing initial health check...');

    try {
      const healthCheck = await BackupMonitoringService.performHealthCheck();
      
      if (healthCheck.status === 'healthy') {
        logger.info('   ✅ System health: HEALTHY');
      } else if (healthCheck.status === 'warning') {
        logger.warn('   ⚠️  System health: WARNING');
        healthCheck.alerts.forEach(alert => logger.warn(`      - ${alert}`));
      } else if (healthCheck.status === 'unhealthy') {
        logger.error('   ❌ System health: UNHEALTHY');
        healthCheck.alerts.forEach(alert => logger.error(`      - ${alert}`));
      } else {
        logger.error('   ❌ System health: ERROR');
        logger.error(`      - ${healthCheck.error}`);
      }

    } catch (error) {
      logger.error('   ❌ Health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Create initial backup
   */
  async createInitialBackup() {
    logger.info('💾 Creating initial backup...');

    try {
      const settings = await BackupSettings.findOne();
      
      if (settings && settings.autoBackupEnabled) {
        const result = await BackupService.createBackup({
          type: 'manual',
          notes: 'Initial system backup',
          compress: settings.compressionEnabled,
          encrypt: settings.encryptionEnabled,
          encryptionKey: settings.encryptionKey
        });

        logger.info(`   ✅ Initial backup created: ${result.backup.fileName}`);
        logger.info(`   📊 Backup size: ${result.backup.fileSizeMb} MB`);
        logger.info(`   ⏱️  Creation time: ${result.duration}ms`);

      } else {
        logger.info('   ✓ Auto backup disabled, skipping initial backup');
      }

    } catch (error) {
      logger.warn('   ⚠️  Failed to create initial backup:', error.message);
      // Don't throw error - initial backup is optional
    }
  }

  /**
   * Display system status
   */
  async displaySystemStatus() {
    logger.info('\n📋 Backup System Status:');
    logger.info('========================');

    try {
      // Get backup statistics
      const stats = await BackupService.getBackupStats();
      logger.info(`📊 Total backups: ${stats.totalBackups}`);
      logger.info(`💾 Total size: ${stats.totalSizeMb} MB`);
      logger.info(`📈 Success rate: ${stats.successRate}%`);

      if (stats.lastBackup) {
        logger.info(`🕒 Last backup: ${new Date(stats.lastBackup.createdAt).toLocaleString()}`);
      }

      // Get scheduler status
      const schedulerStatus = BackupScheduler.getStatus();
      logger.info(`⏰ Scheduler: ${schedulerStatus.isRunning ? 'Running' : 'Stopped'}`);
      logger.info(`📅 Active jobs: ${schedulerStatus.jobCount}`);

      // Get monitoring status
      const healthCheck = await BackupMonitoringService.performHealthCheck();
      logger.info(`🏥 Health status: ${healthCheck.status.toUpperCase()}`);

      // Cloud storage status
      if (this.services.cloudStorage) {
        const providers = CloudStorageService.getAvailableProviders();
        logger.info(`☁️  Cloud storage: ${providers.join(', ')}`);
      } else {
        logger.info('☁️  Cloud storage: Disabled');
      }

    } catch (error) {
      logger.error('❌ Failed to get system status:', error.message);
    }

    logger.info('\n🎉 Backup system is ready!');
    logger.info('💡 Use the API endpoints to manage backups:');
    logger.info('   - GET /api/backup/settings - View settings');
    logger.info('   - POST /api/backup/create - Create backup');
    logger.info('   - GET /api/backup - List backups');
    logger.info('   - GET /api/backup/monitoring - View monitoring dashboard');
  }

  /**
   * Shutdown the backup system
   */
  async shutdown() {
    logger.info('🛑 Shutting down backup system...');

    try {
      if (this.services.scheduler) {
        BackupScheduler.stop();
        logger.info('   ✓ Scheduler stopped');
      }

      if (this.services.monitoring) {
        BackupMonitoringService.stop();
        logger.info('   ✓ Monitoring stopped');
      }

      logger.info('✅ Backup system shutdown complete');

    } catch (error) {
      logger.error('❌ Error during shutdown:', error.message);
    }
  }
}

// Main execution
async function main() {
  const initializer = new BackupSystemInitializer();

  try {
    await initializer.initialize();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('\n🛑 Received SIGINT, shutting down gracefully...');
      await initializer.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('\n🛑 Received SIGTERM, shutting down gracefully...');
      await initializer.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupSystemInitializer;
