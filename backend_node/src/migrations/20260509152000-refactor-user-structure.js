'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Cập nhật bảng Users
    await queryInterface.addColumn('Users', 'account_number', {
      type: Sequelize.STRING,
      unique: true,
      after: 'id'
    });
    await queryInterface.addColumn('Users', 'phone', {
      type: Sequelize.STRING,
      unique: true,
      after: 'email'
    });

    // 2. Tạo bảng UserProfiles
    await queryInterface.createTable('UserProfiles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      full_name: {
        type: Sequelize.STRING
      },
      dob: {
        type: Sequelize.DATEONLY
      },
      gender: {
        type: Sequelize.STRING
      },
      nationality: {
        type: Sequelize.STRING,
        defaultValue: 'Việt Nam'
      },
      id_card_number: {
        type: Sequelize.STRING,
        unique: true
      },
      id_card_issue_date: {
        type: Sequelize.DATEONLY
      },
      id_card_issue_place: {
        type: Sequelize.STRING
      },
      id_card_expiry_date: {
        type: Sequelize.DATEONLY
      },
      address: {
        type: Sequelize.TEXT
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

    // 3. Tạo bảng UserHistories
    await queryInterface.createTable('UserHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      old_value: {
        type: Sequelize.TEXT
      },
      new_value: {
        type: Sequelize.TEXT
      },
      change_type: {
        type: Sequelize.STRING, // e.g., 'PROFILE_UPDATE', 'PASSWORD_CHANGE', 'PIN_CHANGE'
        defaultValue: 'PROFILE_UPDATE'
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

    // Chuyển dữ liệu full_name hiện tại sang UserProfiles (nếu có)
    // Lưu ý: Đây là script migration nên ta dùng query thô
    const [users] = await queryInterface.sequelize.query('SELECT id, full_name, createdAt, updatedAt FROM Users');
    for (const user of users) {
      await queryInterface.bulkInsert('UserProfiles', [{
        user_id: user.id,
        full_name: user.full_name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }]);
    }

    // Xóa cột full_name ở bảng Users sau khi đã chuyển
    await queryInterface.removeColumn('Users', 'full_name');
  },

  down: async (queryInterface, Sequelize) => {
    // Hoàn tác: Thêm lại full_name vào Users
    await queryInterface.addColumn('Users', 'full_name', {
      type: Sequelize.STRING
    });

    // Chuyển dữ liệu ngược lại
    const [profiles] = await queryInterface.sequelize.query('SELECT user_id, full_name FROM UserProfiles');
    for (const profile of profiles) {
      await queryInterface.sequelize.query(`UPDATE Users SET full_name = ? WHERE id = ?`, {
        replacements: [profile.full_name, profile.user_id]
      });
    }

    // Xóa các bảng và cột đã thêm
    await queryInterface.dropTable('UserHistories');
    await queryInterface.dropTable('UserProfiles');
    await queryInterface.removeColumn('Users', 'phone');
    await queryInterface.removeColumn('Users', 'account_number');
  }
};
