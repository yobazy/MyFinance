// Model field mapping tests
describe('Model Field Mappings', () => {
  test('should have CategorizationRule model file', () => {
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(__dirname, '../models/CategorizationRule.js');
    expect(fs.existsSync(modelPath)).toBe(true);
  });

  test('should have Category model file', () => {
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(__dirname, '../models/Category.js');
    expect(fs.existsSync(modelPath)).toBe(true);
  });

  test('should have Transaction model file', () => {
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(__dirname, '../models/Transaction.js');
    expect(fs.existsSync(modelPath)).toBe(true);
  });

  test('should have Account model file', () => {
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(__dirname, '../models/Account.js');
    expect(fs.existsSync(modelPath)).toBe(true);
  });

  test('should have models index file', () => {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.join(__dirname, '../models/index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('should be able to require Sequelize', () => {
    const { Sequelize } = require('sequelize');
    expect(Sequelize).toBeDefined();
  });
});
