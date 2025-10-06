# Enhanced Backup System

## 🚀 Overview

The MyFinance Dashboard now features an enterprise-grade backup system with advanced capabilities including compression, encryption, integrity validation, cloud storage, monitoring, and automated scheduling.

## ✨ Key Features

### 🔧 Core Features
- **Gzip Compression**: Reduces backup size by up to 80%
- **AES-256 Encryption**: Optional encryption for sensitive data
- **SHA-256 Integrity Validation**: Ensures backup integrity
- **Cron-based Scheduling**: Flexible automated backup scheduling
- **Cloud Storage Support**: AWS S3, Google Cloud Storage, Azure Blob Storage
- **Real-time Monitoring**: Health checks and alerting system
- **Advanced Retention**: Time, count, and size-based cleanup policies

### 🛡️ Security Features
- **Encryption at Rest**: Optional AES-256-CBC encryption
- **Integrity Verification**: SHA-256 checksums for all backups
- **Secure Key Management**: Environment variable support
- **Access Control**: File permission management

### 📊 Monitoring & Alerting
- **Health Dashboard**: Real-time system status
- **Performance Metrics**: Backup statistics and trends
- **Failure Detection**: Automatic alerting for backup issues
- **Storage Monitoring**: Disk space and usage tracking

## 🏗️ Architecture

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

## 🚀 Quick Start

### 1. Installation
```bash
# Install dependencies
npm install

# Run database migration
node migrations/add-backup-enhancements.js

# Initialize backup system
node scripts/init-backup-system.js
```

### 2. Basic Usage
```javascript
const BackupService = require('./services/BackupService');

// Create a backup
const result = await BackupService.createBackup({
  type: 'manual',
  notes: 'Before system update',
  compress: true,
  encrypt: false
});

console.log('Backup created:', result.backup.fileName);
```

### 3. API Endpoints
```bash
# Create backup
POST /api/backup/create

# List backups
GET /api/backup

# Get settings
GET /api/backup/settings

# Health check
GET /api/backup/health

# Monitoring dashboard
GET /api/backup/monitoring
```

## 📋 Configuration

### Environment Variables
```bash
# Encryption
BACKUP_ENCRYPTION_KEY=your-secure-key-here

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-backup-bucket

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
GOOGLE_CLOUD_BUCKET=your-backup-bucket

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_CONTAINER_NAME=your-container
```

### Settings Configuration
```javascript
{
  "maxBackups": 10,
  "autoBackupEnabled": true,
  "backupFrequencyHours": 24,
  "compressionEnabled": true,
  "encryptionEnabled": false,
  "retentionDays": 30,
  "cloudStorageEnabled": false
}
```

## 🔧 Services

### BackupService
Core backup functionality with compression, encryption, and integrity validation.

```javascript
const BackupService = require('./services/BackupService');

// Create backup
const result = await BackupService.createBackup(options);

// Verify integrity
const isValid = await BackupService.verifyBackupIntegrity(filePath, checksum);

// Restore backup
const restoreResult = await BackupService.restoreBackup(backupId, encryptionKey);
```

### BackupScheduler
Cron-based scheduling for automated backups.

```javascript
const BackupScheduler = require('./services/BackupScheduler');

// Start scheduler
await BackupScheduler.start();

// Schedule one-time backup
const jobName = await BackupScheduler.scheduleOneTimeBackup(scheduleTime, options);

// Schedule recurring backup
const recurringJob = await BackupScheduler.scheduleCustomBackup(cronExpression, options);
```

### CloudStorageService
Multi-provider cloud storage integration.

```javascript
const CloudStorageService = require('./services/CloudStorageService');

// Initialize
await CloudStorageService.initialize(config);

// Upload backup
const result = await CloudStorageService.uploadBackup(filePath, fileName, provider);

// Download backup
const downloadResult = await CloudStorageService.downloadBackup(fileName, provider, localPath);
```

### BackupMonitoringService
Health monitoring and alerting system.

```javascript
const BackupMonitoringService = require('./services/BackupMonitoringService');

// Start monitoring
await BackupMonitoringService.start();

// Get health status
const healthCheck = await BackupMonitoringService.performHealthCheck();

// Get dashboard data
const dashboard = await BackupMonitoringService.getDashboardData();
```

## 📊 API Reference

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

#### Verify Backup
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

### Monitoring

#### Health Check
```http
GET /api/backup/health
```

#### Monitoring Dashboard
```http
GET /api/backup/monitoring
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run backup tests only
npm test -- --testNamePattern="Backup"

# Run with coverage
npm run test:coverage
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- Error handling and edge cases
- Cloud storage mocking
- Performance testing

## 📈 Performance

### Compression
- **Gzip Level 9**: Maximum compression
- **Space Savings**: Up to 80% reduction
- **CPU Trade-off**: Higher compression = more CPU usage

### Storage Optimization
- **Retention Policies**: Automatic cleanup
- **Size Limits**: Configurable maximum storage
- **Tiered Storage**: Cloud storage for long-term retention

### Monitoring
- **Health Checks**: Every hour
- **Performance Metrics**: Real-time tracking
- **Alert Thresholds**: Configurable limits

## 🔒 Security

### Encryption
- **Algorithm**: AES-256-CBC
- **Key Management**: Environment variables
- **Key Rotation**: Manual process (planned for future)

### Access Control
- **File Permissions**: 600 (owner read/write only)
- **API Authentication**: Express middleware
- **Cloud Security**: Provider-specific IAM

### Data Integrity
- **Checksums**: SHA-256 for all backups
- **Verification**: Automatic integrity checks
- **Recovery**: Graceful error handling

## 🚨 Troubleshooting

### Common Issues

#### Backup Creation Fails
```bash
# Check database file permissions
ls -la db.sqlite3

# Verify backup directory exists
ls -la backups/

# Check disk space
df -h
```

#### Integrity Check Fails
```bash
# Verify file wasn't corrupted
ls -la backups/myfinance_backup_*.db

# Check file permissions
chmod 600 backups/myfinance_backup_*.db
```

#### Cloud Upload Fails
```bash
# Check credentials
echo $AWS_ACCESS_KEY_ID

# Verify network connectivity
ping s3.amazonaws.com

# Check bucket permissions
aws s3 ls s3://your-bucket
```

### Logs
```bash
# View backup logs
tail -f logs/backup-combined.log

# View error logs
tail -f logs/backup-error.log

# View scheduler logs
tail -f logs/backup-scheduler-combined.log
```

## 📚 Documentation

- [Complete API Documentation](docs/BACKUP_SYSTEM.md)
- [Configuration Examples](config/backup-config.example.js)
- [Migration Guide](migrations/add-backup-enhancements.js)
- [Initialization Script](scripts/init-backup-system.js)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review log files
3. Check GitHub issues
4. Contact the development team

---

**Note**: This backup system is designed for production use with proper security measures. Always test backup and restore procedures in a safe environment before relying on them for critical data.
