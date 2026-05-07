'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasOne(models.Wallet, { foreignKey: 'user_id', as: 'wallet' });
      User.hasMany(models.Order, { foreignKey: 'user_id', as: 'orders' });
      User.hasMany(models.Holding, { foreignKey: 'user_id', as: 'holdings' });
      User.hasMany(models.AdminLog, { foreignKey: 'admin_id', as: 'adminLogs' });
      User.hasMany(models.Leaderboard, { foreignKey: 'user_id', as: 'leaderboardEntries' });
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    full_name: DataTypes.STRING,
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'USER'),
      allowNull: false,
      defaultValue: 'USER'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'LOCKED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    pin_code: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};