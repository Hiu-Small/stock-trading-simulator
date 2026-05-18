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
  });
  return UserHistory;
};
