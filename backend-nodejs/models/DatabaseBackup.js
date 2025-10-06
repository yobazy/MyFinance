module.exports = (sequelize, DataTypes) => {
  const DatabaseBackup = sequelize.define('DatabaseBackup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name'
    },
    backupType: {
      type: DataTypes.ENUM('auto', 'manual', 'scheduled'),
      defaultValue: 'manual',
      field: 'backup_type'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size'
    },
    isCompressed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_compressed'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'backend_databasebackup',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['created_at']
      }
    ]
  });

  return DatabaseBackup;
};
