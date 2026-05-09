'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('Users', 'UserAccounts');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('UserAccounts', 'Users');
  }
};
