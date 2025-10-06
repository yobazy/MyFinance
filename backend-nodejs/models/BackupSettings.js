module.exports = (sequelize, DataTypes) => {
  const BackupSettings = sequelize.define('BackupSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    maxBackups: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'max_backups'
    },
    autoBackupEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'auto_backup_enabled'
    },
    backupFrequencyHours: {
      type: DataTypes.INTEGER,
      defaultValue: 24,
      field: 'backup_frequency_hours'
    },
    lastBackup: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_backup'
    },
    backupLocation: {
      type: DataTypes.STRING(500),
      defaultValue: 'backups/',
      field: 'backup_location'
    },
    compressionEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'compression_enabled'
    },
    encryptionEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'encryption_enabled'
    },
    encryptionKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'encryption_key'
    },
    retentionDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'retention_days'
    },
    maxBackupSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'max_backup_size'
    },
    cloudStorageEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'cloud_storage_enabled'
    },
    cloudProvider: {
      type: DataTypes.ENUM('aws_s3', 'google_cloud', 'azure'),
      allowNull: true,
      field: 'cloud_provider'
    },
    cloudConfig: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'cloud_config'
    }
  }, {
    tableName: 'backend_backupsettings',
    timestamps: false
  });

  return BackupSettings;
};
