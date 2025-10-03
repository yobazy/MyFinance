module.exports = (sequelize, DataTypes) => {
  const RuleUsage = sequelize.define('RuleUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ruleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'backend_categorizationrule',
        key: 'id'
      }
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'backend_transaction',
        key: 'id'
      }
    },
    matchedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0
    },
    wasApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'backend_ruleusage',
    timestamps: false,
    indexes: [
      {
        fields: ['matchedAt']
      }
    ]
  });

  RuleUsage.associate = (models) => {
    RuleUsage.belongsTo(models.CategorizationRule, {
      foreignKey: 'ruleId',
      as: 'rule'
    });
    
    RuleUsage.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });
  };

  return RuleUsage;
};
