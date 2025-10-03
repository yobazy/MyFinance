module.exports = (sequelize, DataTypes) => {
  const RuleGroup = sequelize.define('RuleGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#2196F3'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'backend_rulegroup',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  RuleGroup.associate = (models) => {
    RuleGroup.hasMany(models.CategorizationRule, {
      foreignKey: 'ruleGroupId',
      as: 'rules'
    });
  };

  return RuleGroup;
};
