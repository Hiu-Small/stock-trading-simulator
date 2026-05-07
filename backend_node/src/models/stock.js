'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Stock extends Model {
    static associate(models) {
      Stock.hasMany(models.Order, { foreignKey: 'stock_id', as: 'orders' });
      Stock.hasMany(models.Holding, { foreignKey: 'stock_id', as: 'holdings' });
      Stock.hasMany(models.CorporateAction, { foreignKey: 'stock_id', as: 'corporateActions' });
    }
  }
  Stock.init({
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    exchange: {
      type: DataTypes.ENUM('HOSE', 'HNX', 'UPCOM'),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Stock',
  });
  return Stock;
};
