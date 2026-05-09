'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserAccount.hasOne(models.Wallet, { foreignKey: 'user_id', as: 'wallet' });
      UserAccount.hasMany(models.Order, { foreignKey: 'user_id', as: 'orders' });
      UserAccount.hasMany(models.Holding, { foreignKey: 'user_id', as: 'holdings' });
      UserAccount.hasMany(models.AdminLog, { foreignKey: 'admin_id', as: 'adminLogs' });
      UserAccount.hasMany(models.Leaderboard, { foreignKey: 'user_id', as: 'leaderboardEntries' });
      
      // Mới thêm
      UserAccount.hasOne(models.UserProfile, { foreignKey: 'user_id', as: 'profile' });
      UserAccount.hasMany(models.UserHistory, { foreignKey: 'user_id', as: 'histories' });
    }
  }
  UserAccount.init({
    account_number: {
      type: DataTypes.STRING,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING,
      unique: true
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'USER'),
      allowNull: false,
      defaultValue: 'USER'
    },
    status: {
      type: DataTypes.ENUM('UNVERIFIED', 'KYC_COMPLETED', 'ACTIVE', 'LOCKED'),
      allowNull: false,
      defaultValue: 'UNVERIFIED'
    },
    pin_code: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'UserAccount',
    tableName: 'UserAccounts'
  });
  return UserAccount;
};