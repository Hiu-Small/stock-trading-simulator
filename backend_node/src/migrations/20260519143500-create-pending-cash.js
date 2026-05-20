'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Tạo bảng PendingCashes
    await queryInterface.createTable('PendingCashes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      matched_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      cleared: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. Thêm cột pending_cash vào bảng Wallets
    await queryInterface.addColumn('Wallets', 'pending_cash', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    // 3. Thêm cột advance_fee vào bảng Orders
    await queryInterface.addColumn('Orders', 'advance_fee', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Xóa cột advance_fee khỏi bảng Orders
    await queryInterface.removeColumn('Orders', 'advance_fee');
    // 2. Xóa cột pending_cash khỏi bảng Wallets
    await queryInterface.removeColumn('Wallets', 'pending_cash');
    // 3. Xóa bảng PendingCashes
    await queryInterface.dropTable('PendingCashes');
  }
};
