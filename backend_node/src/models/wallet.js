'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Wallet extends Model {
    static associate(models) {
      Wallet.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
    }
  }
  Wallet.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    balance: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 100000000.00
    },
    frozen_balance: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_invested: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    pending_cash: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'Wallet',
    hooks: {
      afterUpdate: (wallet, options) => {
        try {
          const { sendBalanceUpdate } = require('../config/socket.js');
          const availableCash = parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance);
          sendBalanceUpdate(wallet.user_id, availableCash);
        } catch (err) {
          console.error('[Wallet Hook] Error sending socket balance update:', err);
        }
      }
    }
  });
  return Wallet;
};
