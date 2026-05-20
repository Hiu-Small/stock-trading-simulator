'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PendingCash extends Model {
    static associate(models) {
      PendingCash.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
    }
  }
  PendingCash.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false
    },
    matched_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    cleared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'PendingCash',
    tableName: 'PendingCashes'
  });
  return PendingCash;
};
