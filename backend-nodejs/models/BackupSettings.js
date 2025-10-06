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
      field: 'maxBackups'
    },
    autoBackupEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'autoBackupEnabled'
    },
    backupFrequencyHours: {
      type: DataTypes.INTEGER,
      defaultValue: 24,
      field: 'backupFrequencyHours'
    },
    lastBackup: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastBackup'
    },
    backupLocation: {
      type: DataTypes.STRING(500),
      defaultValue: 'backups/',
      field: 'backupLocation'
    }
  }, {
    tableName: 'backend_backupsettings',
    timestamps: false
  });

  return BackupSettings;
};
