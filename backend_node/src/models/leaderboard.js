'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Leaderboard extends Model {
    static associate(models) {
      Leaderboard.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
    }
  }
  Leaderboard.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rank_type: {
      type: DataTypes.ENUM('DAILY', 'ALL_TIME'),
      allowNull: false
    },
    total_asset: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false
    },
    profit_percentage: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    captured_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Leaderboard',
  });
  return Leaderboard;
};
