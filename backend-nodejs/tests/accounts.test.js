// Accounts API structure and validation tests
const path = require('path');
const fs = require('fs');

describe('Accounts API Structure Tests', () => {
  test('should have accounts route file', () => {
    const routePath = path.join(__dirname, '../routes/accounts.js');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  test('should have Account model file', () => {
    const modelPath = path.join(__dirname, '../models/Account.js');
    expect(fs.existsSync(modelPath)).toBe(true);
  });

  test('should be able to require accounts router', () => {
    const accountsRouter = require('../routes/accounts');
    expect(accountsRouter).toBeDefined();
  });

  test('should be able to require Account model', () => {
    const Account = require('../models/Account');
    expect(Account).toBeDefined();
  });

  test('should have supported banks defined', () => {
    // Check if upload.js contains the supported banks
    const uploadPath = path.join(__dirname, '../routes/upload.js');
    const uploadContent = fs.readFileSync(uploadPath, 'utf8');
    
    expect(uploadContent).toContain('TD');
    expect(uploadContent).toContain('Amex');
    expect(uploadContent).toContain('Scotiabank');
  });

  test('should have account creation endpoint', () => {
    const accountsPath = path.join(__dirname, '../routes/accounts.js');
    const accountsContent = fs.readFileSync(accountsPath, 'utf8');
    
    expect(accountsContent).toContain('router.post(\'/create\'');
    expect(accountsContent).toContain('Bank and account name are required');
  });

  test('should have duplicate prevention logic', () => {
    const accountsPath = path.join(__dirname, '../routes/accounts.js');
    const accountsContent = fs.readFileSync(accountsPath, 'utf8');
    
    expect(accountsContent).toContain('already exists');
    expect(accountsContent).toContain('findOne');
  });

  test('should have account types validation', () => {
    const accountPath = path.join(__dirname, '../models/Account.js');
    const accountContent = fs.readFileSync(accountPath, 'utf8');
    
    expect(accountContent).toContain('checking');
    expect(accountContent).toContain('savings');
    expect(accountContent).toContain('credit');
  });

  test('should have unique constraint on bank and name', () => {
    const accountPath = path.join(__dirname, '../models/Account.js');
    const accountContent = fs.readFileSync(accountPath, 'utf8');
    
    expect(accountContent).toContain('unique: true');
    expect(accountContent).toContain('fields: [\'bank\', \'name\']');
  });
});
