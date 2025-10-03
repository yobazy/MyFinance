module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'backend_account',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'backend_category',
        key: 'id'
      }
    },
    autoCategorized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    suggestedCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'backend_category',
        key: 'id'
      }
    }
  }, {
    tableName: 'backend_transaction',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['accountId']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['source']
      }
    ]
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Account, {
      foreignKey: 'accountId',
      as: 'account'
    });
    
    Transaction.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    
    Transaction.belongsTo(models.Category, {
      foreignKey: 'suggestedCategoryId',
      as: 'suggestedCategory'
    });
    
    Transaction.hasMany(models.RuleUsage, {
      foreignKey: 'transactionId',
      as: 'ruleUsages'
    });
  };

  return Transaction;
};
