const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import all models
const Account = require('./Account');
const Category = require('./Category');
const Transaction = require('./Transaction');
const TDTransaction = require('./TDTransaction');
const AmexTransaction = require('./AmexTransaction');
const ScotiabankTransaction = require('./ScotiabankTransaction');
const CategorizationRule = require('./CategorizationRule');
const RuleGroup = require('./RuleGroup');
const RuleUsage = require('./RuleUsage');
const BackupSettings = require('./BackupSettings');
const DatabaseBackup = require('./DatabaseBackup');

// Initialize models
const models = {
  Account: Account(sequelize, DataTypes),
  Category: Category(sequelize, DataTypes),
  Transaction: Transaction(sequelize, DataTypes),
  TDTransaction: TDTransaction(sequelize, DataTypes),
  AmexTransaction: AmexTransaction(sequelize, DataTypes),
  ScotiabankTransaction: ScotiabankTransaction(sequelize, DataTypes),
  CategorizationRule: CategorizationRule(sequelize, DataTypes),
  RuleGroup: RuleGroup(sequelize, DataTypes),
  RuleUsage: RuleUsage(sequelize, DataTypes),
  BackupSettings: BackupSettings(sequelize, DataTypes),
  DatabaseBackup: DatabaseBackup(sequelize, DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  ...models,
  syncDatabase
};
