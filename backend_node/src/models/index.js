'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

// Override Model.init to force all table names to be lowercase (fixing Linux case-sensitivity issues)
const originalInit = Sequelize.Model.init;
Sequelize.Model.init = function (attributes, options) {
  if (options) {
    let tableName = options.tableName || options.modelName + 's';
    if (options.modelName === 'UserHistory') {
      tableName = 'userhistories';
    } else if (options.modelName === 'CorporateAction') {
      tableName = 'corporateactions';
    } else if (options.modelName === 'PendingCash') {
      tableName = 'pendingcashes';
    }
    options.tableName = tableName.toLowerCase();
    options.freezeTableName = true;
  }
  return originalInit.call(this, attributes, options);
};
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
