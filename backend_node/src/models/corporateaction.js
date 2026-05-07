'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CorporateAction extends Model {
    static associate(models) {
      CorporateAction.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' });
    }
  }
  CorporateAction.init({
    stock_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('CASH_DIVIDEND', 'STOCK_BONUS'),
      allowNull: false
    },
    amount_per_share: DataTypes.DECIMAL(18, 2),
    ratio: DataTypes.FLOAT,
    ex_dividend_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED'),
      allowNull: false,
      defaultValue: 'PENDING'
    }
  }, {
    sequelize,
    modelName: 'CorporateAction',
  });
  return CorporateAction;
};
