const request = require('supertest');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { DatabaseBackup, BackupSettings } = require('../models');
const BackupService = require('../services/BackupService');
const BackupScheduler = require('../services/BackupScheduler');
const CloudStorageService = require('../services/CloudStorageService');
const BackupMonitoringService = require('../services/BackupMonitoringService');

// Mock the app
const express = require('express');
const backupRoutes = require('../routes/backup');
const app = express();
app.use(express.json());
app.use('/api/backup', backupRoutes);

describe('Backup System Tests', () => {
  let testDbPath;
  let testBackupDir;

  beforeAll(async () => {
    // Create test database
    testDbPath = path.join(__dirname, 'test.db');
    testBackupDir = path.join(__dirname, 'test-backups');
    
    // Ensure test directories exist
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }

    // Create a test database file
    fs.writeFileSync(testDbPath, 'test database content');
    
    // Mock the database path
    const originalResolve = path.resolve;
    path.resolve = jest.fn((...args) => {
      if (args[0] === 'db.sqlite3') {
        return testDbPath;
      }
      return originalResolve(...args);
    });
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }

    // Restore original path.resolve
    path.resolve = require('path').resolve;
  });

  beforeEach(async () => {
    // Clean up database before each test
    await DatabaseBackup.destroy({ where: {} });
    await BackupSettings.destroy({ where: {} });
  });

  describe('BackupService', () => {
    test('should create a backup successfully', async () => {
      const result = await BackupService.createBackup({
        type: 'manual',
        notes: 'Test backup',
        compress: true,
        encrypt: false
      });

      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.backup.fileName).toMatch(/myfinance_backup_/);
      expect(result.backup.isCompressed).toBe(true);
      expect(result.backup.isEncrypted).toBe(false);
      expect(result.backup.checksum).toBeDefined();
    });

    test('should create an encrypted backup', async () => {
      const encryptionKey = 'test-encryption-key-123';
      
      const result = await BackupService.createBackup({
        type: 'manual',
        notes: 'Test encrypted backup',
        compress: true,
        encrypt: true,
        encryptionKey: encryptionKey
      });

      expect(result.success).toBe(true);
      expect(result.backup.isEncrypted).toBe(true);
    });

    test('should verify backup integrity', async () => {
      const result = await BackupService.createBackup({
        type: 'manual',
        notes: 'Test backup for integrity check'
      });

      const isValid = await BackupService.verifyBackupIntegrity(
        result.backup.filePath,
        result.backup.checksum
      );

      expect(isValid).toBe(true);
    });

    test('should fail integrity check with wrong checksum', async () => {
      const result = await BackupService.createBackup({
        type: 'manual',
        notes: 'Test backup for integrity check'
      });

      const isValid = await BackupService.verifyBackupIntegrity(
        result.backup.filePath,
        'wrong-checksum'
      );

      expect(isValid).toBe(false);
    });

    test('should restore backup successfully', async () => {
      // Create a backup
      const backupResult = await BackupService.createBackup({
        type: 'manual',
        notes: 'Test backup for restore'
      });

      // Restore the backup
      const restoreResult = await BackupService.restoreBackup(backupResult.backup.id);

      expect(restoreResult.success).toBe(true);
    });

    test('should handle backup creation errors gracefully', async () => {
      // Mock fs.existsSync to return false for database file
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn((filePath) => {
        if (filePath === testDbPath) return false;
        return originalExistsSync(filePath);
      });

      await expect(BackupService.createBackup({
        type: 'manual',
        notes: 'Test backup that should fail'
      })).rejects.toThrow('Database file not found');

      // Restore original function
      fs.existsSync = originalExistsSync;
    });
  });

  describe('BackupScheduler', () => {
    test('should start and stop scheduler', async () => {
      await BackupScheduler.start();
      expect(BackupScheduler.getStatus().isRunning).toBe(true);

      BackupScheduler.stop();
      expect(BackupScheduler.getStatus().isRunning).toBe(false);
    });

    test('should schedule one-time backup', async () => {
      const scheduleTime = new Date(Date.now() + 1000); // 1 second from now
      
      const jobName = await BackupScheduler.scheduleOneTimeBackup(scheduleTime, {
        type: 'manual',
        notes: 'Scheduled test backup'
      });

      expect(jobName).toBeDefined();
      expect(BackupScheduler.getScheduledJobs()).toContain(jobName);

      // Cancel the job
      const cancelled = BackupScheduler.cancelJob(jobName);
      expect(cancelled).toBe(true);
    });

    test('should schedule recurring backup', async () => {
      const jobName = await BackupScheduler.scheduleCustomBackup('0 * * * *', {
        type: 'manual',
        notes: 'Recurring test backup'
      });

      expect(jobName).toBeDefined();
      expect(BackupScheduler.getScheduledJobs()).toContain(jobName);

      // Cancel the job
      const cancelled = BackupScheduler.cancelJob(jobName);
      expect(cancelled).toBe(true);
    });
  });

  describe('BackupMonitoringService', () => {
    test('should perform health check', async () => {
      const healthCheck = await BackupMonitoringService.performHealthCheck();

      expect(healthCheck).toBeDefined();
      expect(healthCheck.timestamp).toBeDefined();
      expect(healthCheck.status).toMatch(/healthy|unhealthy|warning|error/);
      expect(healthCheck.checks).toBeDefined();
    });

    test('should get dashboard data', async () => {
      const dashboardData = await BackupMonitoringService.getDashboardData();

      expect(dashboardData).toBeDefined();
      expect(dashboardData.healthCheck).toBeDefined();
      expect(dashboardData.recentBackups).toBeDefined();
      expect(dashboardData.backupStats).toBeDefined();
    });

    test('should get backup statistics', async () => {
      // Create some test backups
      await DatabaseBackup.create({
        fileName: 'test1.db',
        backupType: 'manual',
        filePath: '/test/path1.db',
        fileSize: 1024,
        isCompressed: false,
        isEncrypted: false,
        status: 'completed',
        notes: 'Test backup 1'
      });

      await DatabaseBackup.create({
        fileName: 'test2.db',
        backupType: 'auto',
        filePath: '/test/path2.db',
        fileSize: 2048,
        isCompressed: true,
        isEncrypted: false,
        status: 'completed',
        notes: 'Test backup 2'
      });

      const stats = await BackupMonitoringService.getBackupStatistics();

      expect(stats.totalBackups).toBe(2);
      expect(stats.successfulBackups).toBe(2);
      expect(stats.failedBackups).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.totalSize).toBe(3072);
    });
  });

  describe('API Endpoints', () => {
    test('GET /api/backup/settings should return default settings', async () => {
      const response = await request(app)
        .get('/api/backup/settings')
        .expect(200);

      expect(response.body).toHaveProperty('maxBackups');
      expect(response.body).toHaveProperty('autoBackupEnabled');
      expect(response.body).toHaveProperty('backupFrequencyHours');
      expect(response.body).toHaveProperty('backupLocation');
    });

    test('PUT /api/backup/settings should update settings', async () => {
      const newSettings = {
        maxBackups: 10,
        autoBackupEnabled: false,
        backupFrequencyHours: 12,
        compressionEnabled: true,
        encryptionEnabled: false
      };

      const response = await request(app)
        .put('/api/backup/settings')
        .send(newSettings)
        .expect(200);

      expect(response.body.maxBackups).toBe(10);
      expect(response.body.autoBackupEnabled).toBe(false);
      expect(response.body.backupFrequencyHours).toBe(12);
    });

    test('POST /api/backup/create should create a backup', async () => {
      const response = await request(app)
        .post('/api/backup/create')
        .send({
          notes: 'API test backup',
          compress: true,
          encrypt: false
        })
        .expect(201);

      expect(response.body.message).toBe('Backup created successfully');
      expect(response.body.backup).toBeDefined();
      expect(response.body.backup.fileName).toMatch(/myfinance_backup_/);
    });

    test('GET /api/backup should return backups list', async () => {
      // Create a test backup
      await DatabaseBackup.create({
        fileName: 'test-backup.db',
        backupType: 'manual',
        filePath: '/test/backup.db',
        fileSize: 1024,
        isCompressed: false,
        isEncrypted: false,
        status: 'completed',
        notes: 'Test backup'
      });

      const response = await request(app)
        .get('/api/backup')
        .expect(200);

      expect(response.body.backups).toBeDefined();
      expect(response.body.backups.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    test('GET /api/backup/stats should return statistics', async () => {
      const response = await request(app)
        .get('/api/backup/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalBackups');
      expect(response.body).toHaveProperty('totalSize');
      expect(response.body).toHaveProperty('totalSizeMb');
    });

    test('GET /api/backup/monitoring should return monitoring data', async () => {
      const response = await request(app)
        .get('/api/backup/monitoring')
        .expect(200);

      expect(response.body).toHaveProperty('healthCheck');
      expect(response.body).toHaveProperty('recentBackups');
      expect(response.body).toHaveProperty('backupStats');
    });

    test('POST /api/backup/:id/verify should verify backup integrity', async () => {
      // Create a test backup with checksum
      const backup = await DatabaseBackup.create({
        fileName: 'test-verify.db',
        backupType: 'manual',
        filePath: testDbPath,
        fileSize: 1024,
        isCompressed: false,
        isEncrypted: false,
        status: 'completed',
        checksum: 'test-checksum',
        notes: 'Test backup for verification'
      });

      const response = await request(app)
        .post(`/api/backup/${backup.id}/verify`)
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('checksum');
    });

    test('DELETE /api/backup/:id should delete backup', async () => {
      // Create a test backup
      const backup = await DatabaseBackup.create({
        fileName: 'test-delete.db',
        backupType: 'manual',
        filePath: testDbPath,
        fileSize: 1024,
        isCompressed: false,
        isEncrypted: false,
        status: 'completed',
        notes: 'Test backup for deletion'
      });

      const response = await request(app)
        .delete(`/api/backup/${backup.id}`)
        .expect(200);

      expect(response.body.message).toBe('Backup deleted successfully');

      // Verify backup was deleted
      const deletedBackup = await DatabaseBackup.findByPk(backup.id);
      expect(deletedBackup).toBeNull();
    });

    test('POST /api/backup/schedule should schedule backup', async () => {
      const scheduleTime = new Date(Date.now() + 1000);

      const response = await request(app)
        .post('/api/backup/schedule')
        .send({
          type: 'one-time',
          scheduleTime: scheduleTime.toISOString(),
          options: {
            notes: 'Scheduled test backup'
          }
        })
        .expect(200);

      expect(response.body.message).toBe('Backup scheduled successfully');
      expect(response.body.jobName).toBeDefined();
    });

    test('GET /api/backup/schedule should return scheduled jobs', async () => {
      const response = await request(app)
        .get('/api/backup/schedule')
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('status');
    });

    test('GET /api/backup/health should return health check', async () => {
      const response = await request(app)
        .get('/api/backup/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid backup ID gracefully', async () => {
      const response = await request(app)
        .post('/api/backup/99999/verify')
        .expect(404);

      expect(response.body.error).toBe('Backup not found');
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .put('/api/backup/settings')
        .send({
          maxBackups: -1, // Invalid value
          backupFrequencyHours: 0 // Invalid value
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    test('should handle missing database file during restore', async () => {
      // Create a backup record without actual file
      const backup = await DatabaseBackup.create({
        fileName: 'missing-file.db',
        backupType: 'manual',
        filePath: '/nonexistent/path.db',
        fileSize: 1024,
        isCompressed: false,
        isEncrypted: false,
        status: 'completed',
        notes: 'Test backup with missing file'
      });

      const response = await request(app)
        .post(`/api/backup/${backup.id}/restore`)
        .expect(500);

      expect(response.body.error).toContain('Backup file not found');
    });
  });

  describe('Cloud Storage Integration', () => {
    test('should initialize cloud storage service', async () => {
      const config = {
        aws: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1',
          bucket: 'test-bucket'
        }
      };

      await expect(CloudStorageService.initialize(config)).resolves.not.toThrow();
      expect(CloudStorageService.isProviderConfigured('aws_s3')).toBe(true);
    });

    test('should handle cloud storage errors gracefully', async () => {
      const config = {
        aws: {
          accessKeyId: 'invalid-key',
          secretAccessKey: 'invalid-secret',
          region: 'us-east-1',
          bucket: 'test-bucket'
        }
      };

      await expect(CloudStorageService.initialize(config)).rejects.toThrow();
    });
  });

  describe('Retention Policies', () => {
    test('should clean up old backups based on count', async () => {
      // Create more backups than the limit
      const settings = await BackupSettings.create({
        maxBackups: 2,
        autoBackupEnabled: true,
        backupFrequencyHours: 24,
        backupLocation: testBackupDir
      });

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        await DatabaseBackup.create({
          fileName: `test-backup-${i}.db`,
          backupType: 'manual',
          filePath: path.join(testBackupDir, `test-backup-${i}.db`),
          fileSize: 1024,
          isCompressed: false,
          isEncrypted: false,
          status: 'completed',
          notes: `Test backup ${i}`
        });
      }

      // Trigger cleanup
      await BackupService.cleanupOldBackups(settings);

      // Should only have 2 backups left
      const remainingBackups = await DatabaseBackup.count();
      expect(remainingBackups).toBe(2);
    });
  });
});
