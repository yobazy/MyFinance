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
    }
  }, {
    tableName: 'backend_backupsettings',
    timestamps: false
  });

  return BackupSettings;
};
