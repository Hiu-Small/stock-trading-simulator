'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('AdminLogs', 'level', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'INFO',
      after: 'action'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('AdminLogs', 'level');
  }
};
