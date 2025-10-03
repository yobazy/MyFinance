module.exports = (sequelize, DataTypes) => {
  const TDTransaction = sequelize.define('TDTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    chargeName: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    creditAmt: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    debitAmt: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    tableName: 'td',
    timestamps: false
  });

  return TDTransaction;
};
