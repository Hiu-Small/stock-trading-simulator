'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Trade extends Model {
    static associate(models) {
      Trade.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
    }
  }
  Trade.init({
    order_id: {
      type: DataTypes.INTEGER,
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
    fee_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    matched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Trade',
  });
  return Trade;
};
