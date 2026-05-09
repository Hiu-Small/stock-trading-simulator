'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Note: Changing ENUM in MySQL/PostgreSQL can be tricky depending on the DB version.
    // This is a common approach for MySQL.
    await queryInterface.changeColumn('UserAccounts', 'status', {
      type: Sequelize.ENUM('UNVERIFIED', 'KYC_COMPLETED', 'ACTIVE', 'LOCKED'),
      allowNull: false,
      defaultValue: 'UNVERIFIED'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('UserAccounts', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'LOCKED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    });
  }
};
