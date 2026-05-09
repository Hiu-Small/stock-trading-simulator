'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AdminLog extends Model {
    static associate(models) {
      AdminLog.belongsTo(models.UserAccount, { foreignKey: 'admin_id', as: 'admin' });
    }
  }
  AdminLog.init({
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    target_id: DataTypes.STRING,
    details: DataTypes.TEXT,
    ip_address: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'AdminLog',
  });
  return AdminLog;
};
