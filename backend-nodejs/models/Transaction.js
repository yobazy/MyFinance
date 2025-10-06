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
      field: 'account_id',
      references: {
        model: 'backend_account',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'category_id',
      references: {
        model: 'backend_category',
        key: 'id'
      }
    },
    autoCategorized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'auto_categorized'
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'confidence_score'
    },
    suggestedCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'suggested_category_id',
      references: {
        model: 'backend_category',
        key: 'id'
      }
    }
  }, {
    tableName: 'backend_transaction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['account_id']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['source']
      }
    ]
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Account, {
      foreignKey: 'account_id',
      as: 'account'
    });
    
    Transaction.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
    
    Transaction.belongsTo(models.Category, {
      foreignKey: 'suggested_category_id',
      as: 'suggestedCategory'
    });
    
    Transaction.hasMany(models.RuleUsage, {
      foreignKey: 'transaction_id',
      as: 'ruleUsages'
    });
  };

  return Transaction;
};
