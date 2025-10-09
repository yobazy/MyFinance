# Enhanced Backup System Documentation

## Overview

The MyFinance Dashboard backup system has been completely redesigned with enterprise-grade features including compression, encryption, integrity validation, cloud storage, monitoring, and advanced retention policies.

## Features

### Core Features
- **Compression**: Gzip compression to reduce storage space by up to 80%
- **Encryption**: Optional AES-256-CBC encryption for sensitive data
- **Integrity Validation**: SHA-256 checksums to verify backup integrity
- **Scheduling**: Cron-based automated backups with flexible scheduling
- **Cloud Storage**: Support for AWS S3, Google Cloud Storage, and Azure Blob Storage
- **Monitoring**: Comprehensive health checks and alerting
- **Retention Policies**: Time-based, count-based, and size-based cleanup

### Advanced Features
- **Concurrent Backup Prevention**: Queue system to prevent overlapping backups
- **Error Recovery**: Automatic retry mechanisms and graceful error handling
- **Logging**: Structured logging with Winston for debugging and monitoring
- **API Validation**: Input validation and sanitization
- **Dashboard**: Real-time monitoring dashboard with statistics

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Backup API    │────│  Backup Service  │────│  File System    │
│   (Express)     │    │  (Core Logic)    │    │  (Local)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Scheduler      │    │  Cloud Storage   │    │  Monitoring     │
│  (Cron Jobs)    │    │  (AWS/GCP/Azure) │    │  (Health Checks)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Installation

### Prerequisites
- Node.js 16+ 
- SQLite3
- Required npm packages (installed automatically)

### Dependencies
```json
{
  "archiver": "^5.3.1",
  "node-cron": "^3.0.3",
  "crypto-js": "^4.2.0",
  "winston": "^3.11.0",
  "aws-sdk": "^2.1490.0",
  "@google-cloud/storage": "^7.5.0",
  "@azure/storage-blob": "^12.17.0"
}
```

### Setup
1. Install dependencies:
```bash
npm install
```

2. Run database migration:
```bash
node migrations/add-backup-enhancements.js
```

3. Start the backup scheduler:
```javascript
const BackupScheduler = require('./services/BackupScheduler');
await BackupScheduler.start();
```

## Configuration

### Backup Settings

```javascript
{
  "maxBackups": 5,                    // Maximum number of backups to keep
  "autoBackupEnabled": true,          // Enable automatic backups
  "backupFrequencyHours": 24,         // Hours between automatic backups
  "backupLocation": "backups/",       // Local backup directory
  "compressionEnabled": true,         // Enable gzip compression
  "encryptionEnabled": false,         // Enable encryption
  "encryptionKey": null,              // Encryption key (if enabled)
  "retentionDays": 30,                // Days to keep backups
  "maxBackupSize": 1073741824         // Maximum total backup size (1GB)
}
```

## API Reference

### Backup Management

#### Create Backup
```http
POST /api/backup/create
Content-Type: application/json

{
  "notes": "Manual backup before update",
  "compress": true,
  "encrypt": false,
  "encryptionKey": "optional-key"
}
```

#### List Backups
```http
GET /api/backup?page=1&limit=50&type=manual&status=completed
```

#### Get Backup Statistics
```http
GET /api/backup/stats
```

#### Verify Backup Integrity
```http
POST /api/backup/{backupId}/verify
```

#### Restore Backup
```http
POST /api/backup/{backupId}/restore
Content-Type: application/json

{
  "encryptionKey": "decryption-key-if-encrypted"
}
```

#### Delete Backup
```http
DELETE /api/backup/{backupId}
```

### Settings Management

#### Get Settings
```http
GET /api/backup/settings
```

#### Update Settings
```http
PUT /api/backup/settings
Content-Type: application/json

{
  "maxBackups": 10,
  "autoBackupEnabled": true,
  "backupFrequencyHours": 12,
  "compressionEnabled": true,
  "encryptionEnabled": true,
  "retentionDays": 60
}
```

### Scheduling

#### Schedule One-Time Backup
```http
POST /api/backup/schedule
Content-Type: application/json

{
  "type": "one-time",
  "scheduleTime": "2024-01-01T12:00:00Z",
  "options": {
    "notes": "Scheduled backup",
    "compress": true
  }
}
```

#### Schedule Recurring Backup
```http
POST /api/backup/schedule
Content-Type: application/json

{
  "type": "recurring",
  "cronExpression": "0 2 * * *",
  "options": {
    "notes": "Daily backup at 2 AM"
  }
}
```

#### List Scheduled Jobs
```http
GET /api/backup/schedule
```

#### Cancel Scheduled Job
```http
DELETE /api/backup/schedule/{jobName}
```

### Cloud Storage

#### Upload to Cloud
```http
POST /api/backup/{backupId}/upload-cloud
Content-Type: application/json

{
  "provider": "aws_s3"
}
```

#### Download from Cloud
```http
POST /api/backup/{backupId}/download-cloud
Content-Type: application/json

{
  "provider": "aws_s3",
  "localPath": "/path/to/download"
}
```

#### List Cloud Backups
```http
GET /api/backup/cloud/{provider}?prefix=myfinance_backup_&maxResults=100
```

### Monitoring

#### Health Check
```http
GET /api/backup/health
```

#### Monitoring Dashboard
```http
GET /api/backup/monitoring
```

## Usage Examples

### Basic Backup Creation

```javascript
const BackupService = require('./services/BackupService');

// Create a simple backup
const result = await BackupService.createBackup({
  type: 'manual',
  notes: 'Before system update',
  compress: true,
  encrypt: false
});

console.log('Backup created:', result.backup.fileName);
```

### Encrypted Backup

```javascript
const result = await BackupService.createBackup({
  type: 'manual',
  notes: 'Sensitive data backup',
  compress: true,
  encrypt: true,
  encryptionKey: 'my-secure-key-123'
});

console.log('Encrypted backup created:', result.backup.fileName);
```

### Scheduled Backups

```javascript
const BackupScheduler = require('./services/BackupScheduler');

// Start the scheduler
await BackupScheduler.start();

// Schedule a one-time backup
const jobName = await BackupScheduler.scheduleOneTimeBackup(
  new Date(Date.now() + 60000), // 1 minute from now
  { notes: 'Scheduled backup' }
);

// Schedule recurring backup (daily at 2 AM)
const recurringJob = await BackupScheduler.scheduleCustomBackup(
  '0 2 * * *',
  { notes: 'Daily backup' }
);
```

### Cloud Storage Integration

```javascript
const CloudStorageService = require('./services/CloudStorageService');

// Initialize cloud storage
await CloudStorageService.initialize({
  aws: {
    accessKeyId: 'your-key',
    secretAccessKey: 'your-secret',
    region: 'us-east-1',
    bucket: 'your-bucket'
  }
});

// Upload backup
const result = await CloudStorageService.uploadBackup(
  '/path/to/backup.db.gz',
  'backup-2024-01-01.db.gz',
  'aws_s3'
);

console.log('Uploaded to:', result.url);
```

### Monitoring and Health Checks

```javascript
const BackupMonitoringService = require('./services/BackupMonitoringService');

// Start monitoring
await BackupMonitoringService.start();

// Get health status
const healthCheck = await BackupMonitoringService.performHealthCheck();
console.log('Backup health:', healthCheck.status);

// Get dashboard data
const dashboard = await BackupMonitoringService.getDashboardData();
console.log('Total backups:', dashboard.backupStats.totalBackups);
```

## Security Considerations

### Encryption
- Use strong encryption keys (minimum 8 characters)
- Store encryption keys securely (environment variables, key management systems)
- Consider key rotation policies for long-term storage

### Access Control
- Implement proper authentication and authorization
- Restrict backup file access permissions
- Use secure cloud storage configurations

### Data Integrity
- Always verify backup integrity before restoration
- Implement checksum validation
- Test restore procedures regularly

## Performance Optimization

### Compression
- Enable compression for significant space savings
- Consider compression level based on CPU vs storage trade-offs
- Monitor compression ratios for different data types

### Storage Management
- Implement appropriate retention policies
- Monitor storage usage and trends
- Consider tiered storage for long-term retention

### Network Optimization
- Use appropriate cloud storage regions
- Implement retry logic for network failures
- Consider bandwidth limitations for large backups

## Troubleshooting

### Common Issues

#### Backup Creation Fails
- Check database file permissions
- Verify backup directory exists and is writable
- Check available disk space
- Review error logs for specific issues

#### Integrity Check Fails
- Verify file wasn't corrupted during transfer
- Check if file was modified after backup creation
- Ensure correct checksum calculation

#### Cloud Upload Fails
- Verify cloud provider credentials
- Check network connectivity
- Verify bucket/container permissions
- Review cloud provider error messages

#### Scheduler Not Working
- Check cron expression validity
- Verify scheduler is started
- Check system time and timezone
- Review scheduler logs

### Logging

Logs are stored in the `logs/` directory:
- `backup-combined.log` - All backup operations
- `backup-error.log` - Error messages only
- `backup-scheduler-combined.log` - Scheduler operations
- `backup-monitoring-combined.log` - Monitoring and health checks

### Debug Mode

Enable debug logging by setting the log level:
```javascript
const logger = winston.createLogger({
  level: 'debug', // Change from 'info' to 'debug'
  // ... other configuration
});
```

## Migration Guide

### From Old Backup System

1. **Run Migration Script**:
```bash
node migrations/add-backup-enhancements.js
```

2. **Update API Calls**:
   - Old: `POST /api/backup/create`
   - New: Same endpoint, but with additional options

3. **Update Settings**:
   - Old settings are automatically migrated
   - New settings have default values applied

4. **Test New Features**:
   - Verify compression works
   - Test integrity validation
   - Check monitoring dashboard

### Database Schema Changes

New columns added to existing tables:
- `backend_databasebackup`: `checksum`, `is_encrypted`, `status`
- `backend_backupsettings`: `compression_enabled`, `encryption_enabled`, `encryption_key`, `retention_days`, `max_backup_size`, `cloud_storage_enabled`, `cloud_provider`, `cloud_config`

## Best Practices

### Backup Strategy
1. **3-2-1 Rule**: 3 copies, 2 different media, 1 offsite
2. **Regular Testing**: Test restore procedures monthly
3. **Documentation**: Document backup and restore procedures
4. **Monitoring**: Set up alerts for backup failures
5. **Retention**: Implement appropriate retention policies

### Security
1. **Encryption**: Encrypt sensitive backups
2. **Access Control**: Limit backup access to authorized personnel
3. **Key Management**: Use secure key management practices
4. **Audit Logging**: Monitor backup access and changes

### Performance
1. **Compression**: Enable compression for space savings
2. **Scheduling**: Schedule backups during low-usage periods
3. **Storage**: Use appropriate storage tiers
4. **Monitoring**: Monitor backup performance and storage usage

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review log files
3. Check GitHub issues
4. Contact the development team

## Changelog

### Version 2.0.0
- Complete rewrite of backup system
- Added compression and encryption
- Implemented integrity validation
- Added cloud storage support
- Created monitoring and alerting
- Added comprehensive testing
- Improved error handling and logging
- Added advanced retention policies
