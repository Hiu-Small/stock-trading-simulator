'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add frozen_balance to Wallets
    await queryInterface.addColumn('Wallets', 'frozen_balance', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00,
      after: 'balance'
    });

    // Add symbol to Orders (for convenience, to avoid constant join with Stocks)
    await queryInterface.addColumn('Orders', 'symbol', {
      type: Sequelize.STRING(10),
      allowNull: true,
      after: 'stock_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Wallets', 'frozen_balance');
    await queryInterface.removeColumn('Orders', 'symbol');
  }
};
