'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Holding extends Model {
    static associate(models) {
      Holding.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
      Holding.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' });
    }
  }
  Holding.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stock_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    average_price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    currentPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    totalValue: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'Holding',
  });
  return Holding;
};
