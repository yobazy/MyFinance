module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    bank: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('checking', 'savings', 'credit'),
      defaultValue: 'checking'
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'backend_account',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['bank', 'name']
      }
    ]
  });

  Account.associate = (models) => {
    Account.hasMany(models.Transaction, {
      foreignKey: 'account_id',
      as: 'transactions'
    });
  };

  // Instance methods
  Account.prototype.calculateBalance = async function() {
    const result = await models.Transaction.sum('amount', {
      where: { account_id: this.id }
    });
    return result || 0;
  };

  Account.prototype.updateBalance = async function() {
    const newBalance = await this.calculateBalance();
    this.balance = newBalance;
    await this.save();
    return newBalance;
  };

  return Account;
};
