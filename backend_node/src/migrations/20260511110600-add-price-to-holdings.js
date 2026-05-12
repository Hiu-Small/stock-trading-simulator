'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Holdings', 'currentPrice', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00
    });
    await queryInterface.addColumn('Holdings', 'totalValue', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Holdings', 'currentPrice');
    await queryInterface.removeColumn('Holdings', 'totalValue');
  }
};
