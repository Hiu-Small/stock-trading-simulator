'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserProfile extends Model {
    static associate(models) {
      UserProfile.belongsTo(models.UserAccount, { foreignKey: 'user_id', as: 'user' });
    }
  }
  UserProfile.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    full_name: DataTypes.STRING,
    dob: DataTypes.DATEONLY,
    gender: DataTypes.STRING,
    nationality: {
      type: DataTypes.STRING,
      defaultValue: 'Việt Nam'
    },
    id_card_number: {
      type: DataTypes.STRING,
      unique: true
    },
    id_card_issue_date: DataTypes.DATEONLY,
    id_card_issue_place: DataTypes.STRING,
    id_card_expiry_date: DataTypes.DATEONLY,
    address: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'UserProfile',
  });
  return UserProfile;
};
