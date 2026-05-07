'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const [admin] = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE username = 'admin'`
    );

    if (admin.length === 0) {
      const userId = await queryInterface.bulkInsert('Users', [{
        username: 'admin',
        full_name: 'System Admin',
        password: hashedPassword,
        email: 'admin@tradingsim.io',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

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
    return queryInterface.bulkDelete('Users', { username: 'admin' }, {});
  }
};
