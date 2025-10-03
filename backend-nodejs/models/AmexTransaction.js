module.exports = (sequelize, DataTypes) => {
  const AmexTransaction = sequelize.define('AmexTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dateProcessed: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cardmember: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    excRate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    merchant: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'amex',
    timestamps: false
  });

  return AmexTransaction;
};
