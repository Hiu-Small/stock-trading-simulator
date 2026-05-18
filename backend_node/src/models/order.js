'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
      Order.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' });
      Order.hasMany(models.Trade, { foreignKey: 'order_id', as: 'trades' });
    }
  }
  Order.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stock_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    symbol: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    side: {
      type: DataTypes.ENUM('BUY', 'SELL'),
      allowNull: false
    },
    order_type: {
      type: DataTypes.ENUM('LO', 'MKT', 'ATO', 'ATC'),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    remaining_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'MATCHED', 'PARTIAL_MATCHED', 'CANCELLED', 'FAILED_STUCK'),
      allowNull: false,
      defaultValue: 'PENDING'
    }
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};
