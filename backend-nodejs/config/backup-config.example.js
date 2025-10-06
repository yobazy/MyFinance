/**
 * Backup System Configuration Example
 * 
 * Copy this file to backup-config.js and customize for your environment
 */

module.exports = {
  // Basic backup settings
  backup: {
    // Maximum number of backups to keep
    maxBackups: 10,
    
    // Enable automatic backups
    autoBackupEnabled: true,
    
    // Hours between automatic backups (1-168, max 1 week)
    backupFrequencyHours: 24,
    
    // Local backup directory (relative to project root)
    backupLocation: 'backups/',
    
    // Enable gzip compression (recommended for space savings)
    compressionEnabled: true,
    
    // Enable encryption for sensitive data
    encryptionEnabled: false,
    
    // Encryption key (only used if encryptionEnabled is true)
    // Use a strong, unique key in production
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || null,
    
    // Retention policies
    retention: {
      // Keep backups for this many days (null = no time limit)
      retentionDays: 30,
      
      // Maximum total backup size in bytes (null = no size limit)
      // 1GB = 1073741824 bytes
      maxBackupSize: 1024 * 1024 * 1024, // 1GB
    }
  },

  // Cloud storage configuration
  cloudStorage: {
    // Enable cloud storage
    enabled: false,
    
    // Cloud provider: 'aws_s3', 'google_cloud', or 'azure'
    provider: 'aws_s3',
    
    // Provider-specific configuration
    config: {
      // AWS S3 Configuration
      aws_s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_S3_BUCKET,
        // Optional: S3 storage class for cost optimization
        storageClass: 'STANDARD_IA', // STANDARD, STANDARD_IA, GLACIER, DEEP_ARCHIVE
        // Optional: Server-side encryption
        serverSideEncryption: 'AES256'
      },
      
      // Google Cloud Storage Configuration
      google_cloud: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
        // Alternative: use credentials object instead of keyFilename
        // credentials: {
        //   type: 'service_account',
        //   project_id: 'your-project-id',
        //   private_key_id: 'key-id',
        //   private_key: '-----BEGIN PRIVATE KEY-----\n...',
        //   client_email: 'service-account@project.iam.gserviceaccount.com',
        //   client_id: 'client-id',
        //   auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        //   token_uri: 'https://oauth2.googleapis.com/token'
        // },
        bucket: process.env.GOOGLE_CLOUD_BUCKET,
        // Optional: Storage class for cost optimization
        storageClass: 'NEARLINE', // STANDARD, NEARLINE, COLDLINE, ARCHIVE
        // Optional: Location for the bucket
        location: 'US'
      },
      
      // Azure Blob Storage Configuration
      azure: {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: process.env.AZURE_CONTAINER_NAME,
        // Optional: Access tier for cost optimization
        accessTier: 'Hot' // Hot, Cool, Archive
      }
    }
  },

  // Monitoring and alerting
  monitoring: {
    // Enable monitoring service
    enabled: true,
    
    // Health check interval in milliseconds (default: 1 hour)
    healthCheckInterval: 60 * 60 * 1000,
    
    // Alert thresholds
    thresholds: {
      // Maximum backup age in milliseconds before alert (24 hours)
      maxBackupAge: 24 * 60 * 60 * 1000,
      
      // Maximum backup size in bytes before warning (1GB)
      maxBackupSize: 1024 * 1024 * 1024,
      
      // Minimum free disk space in bytes before warning (1GB)
      minFreeSpace: 1024 * 1024 * 1024,
      
      // Maximum backup failure rate (0.2 = 20%)
      maxFailureRate: 0.2
    },
    
    // Logging configuration
    logging: {
      level: 'info', // 'error', 'warn', 'info', 'debug'
      maxFiles: 5, // Number of log files to keep
      maxSize: '10m', // Maximum size of each log file
      datePattern: 'YYYY-MM-DD' // Date pattern for log file rotation
    }
  },

  // Scheduler configuration
  scheduler: {
    // Enable backup scheduler
    enabled: true,
    
    // Timezone for cron jobs (default: UTC)
    timezone: 'UTC',
    
    // Default backup options for scheduled backups
    defaultOptions: {
      compress: true,
      encrypt: false,
      notes: 'Scheduled backup'
    }
  },

  // Security settings
  security: {
    // Require authentication for backup operations
    requireAuth: true,
    
    // Allowed backup file extensions
    allowedExtensions: ['.db', '.db.gz', '.sqlite', '.sqlite3'],
    
    // Maximum backup file size (100MB)
    maxFileSize: 100 * 1024 * 1024,
    
    // Backup file permissions (octal)
    filePermissions: 0o600, // Read/write for owner only
  },

  // Performance settings
  performance: {
    // Compression level (1-9, 9 = maximum compression)
    compressionLevel: 9,
    
    // Number of concurrent backup operations
    maxConcurrentBackups: 1,
    
    // Backup queue size
    maxQueueSize: 10,
    
    // Timeout for backup operations in milliseconds (30 minutes)
    backupTimeout: 30 * 60 * 1000,
    
    // Retry configuration
    retry: {
      maxAttempts: 3,
      delay: 5000, // 5 seconds
      backoffMultiplier: 2
    }
  },

  // Development and testing
  development: {
    // Enable debug logging
    debug: false,
    
    // Use test database for backups
    useTestDatabase: false,
    
    // Test database path
    testDatabasePath: 'test.db',
    
    // Skip cloud uploads in development
    skipCloudUpload: true
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  // Production-specific settings
  module.exports.backup.encryptionEnabled = true;
  module.exports.backup.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  module.exports.cloudStorage.enabled = true;
  module.exports.monitoring.enabled = true;
  module.exports.development.debug = false;
}

if (process.env.NODE_ENV === 'development') {
  // Development-specific settings
  module.exports.backup.maxBackups = 3;
  module.exports.backup.backupFrequencyHours = 1;
  module.exports.cloudStorage.enabled = false;
  module.exports.monitoring.enabled = false;
  module.exports.development.debug = true;
}

if (process.env.NODE_ENV === 'test') {
  // Test-specific settings
  module.exports.backup.maxBackups = 2;
  module.exports.backup.backupLocation = 'test-backups/';
  module.exports.cloudStorage.enabled = false;
  module.exports.monitoring.enabled = false;
  module.exports.development.debug = true;
  module.exports.development.useTestDatabase = true;
}
