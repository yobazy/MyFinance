module.exports = (sequelize, DataTypes) => {
  const BackupSettings = sequelize.define('BackupSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    maxBackups: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    autoBackupEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    backupFrequencyHours: {
      type: DataTypes.INTEGER,
      defaultValue: 24
    },
    lastBackup: {
      type: DataTypes.DATE,
      allowNull: true
    },
    backupLocation: {
      type: DataTypes.STRING(500),
      defaultValue: 'backups/'
    }
  }, {
    tableName: 'backend_backupsettings',
    timestamps: false
  });

  return BackupSettings;
};
