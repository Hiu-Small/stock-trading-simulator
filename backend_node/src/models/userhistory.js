'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserHistory extends Model {
    static associate(models) {
      UserHistory.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
    }
  }
  UserHistory.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    old_value: DataTypes.TEXT,
    new_value: DataTypes.TEXT,
    change_type: {
      type: DataTypes.STRING,
      defaultValue: 'PROFILE_UPDATE'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'UserHistory',
    hooks: {
      afterCreate: (history, options) => {
        try {
          if (!history.is_read) {
            const { sendNotification } = require('../config/socket.js');
            sendNotification(history.user_id, history.new_value);
          }
        } catch (err) {
          console.error('[UserHistory Hook] Error sending socket notification:', err);
        }
      }
    }
  });
  return UserHistory;
};
