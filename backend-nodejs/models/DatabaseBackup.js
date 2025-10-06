module.exports = (sequelize, DataTypes) => {
  const DatabaseBackup = sequelize.define('DatabaseBackup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    backupType: {
      type: DataTypes.ENUM('auto', 'manual', 'scheduled'),
      defaultValue: 'manual'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    isCompressed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'backend_databasebackup',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['createdAt']
      }
    ]
  });

  return DatabaseBackup;
};
