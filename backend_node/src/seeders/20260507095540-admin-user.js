'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const [admin] = await queryInterface.sequelize.query(
      `SELECT id FROM UserAccounts WHERE username = 'admin'`
    );

    if (admin.length === 0) {
      // 1. Insert User
      await queryInterface.bulkInsert('UserAccounts', [{
        account_number: 'Q000000',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@tradingsim.io',
        phone: '0000000000',
        role: 'ADMIN',
        status: 'ACTIVE',
        pin_code: '1234',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      const [newAdmin] = await queryInterface.sequelize.query(
        `SELECT id FROM UserAccounts WHERE username = 'admin'`
      );
      const userId = newAdmin[0].id;

      // 2. Insert Profile
      await queryInterface.bulkInsert('UserProfiles', [{
        user_id: userId,
        full_name: 'System Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      // 3. Insert Wallet
      return queryInterface.bulkInsert('Wallets', [{
        user_id: userId,
        balance: 999999999.99,
        total_invested: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    // Việc xóa Cascade sẽ tự động xóa Wallet và Profile nếu DB đã set up
    return queryInterface.bulkDelete('UserAccounts', { username: 'admin' }, {});
  }
};
