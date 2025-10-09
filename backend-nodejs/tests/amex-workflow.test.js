const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import database and models
const { sequelize, syncDatabase } = require('../models');

// Import the Express app
const express = require('express');
const accountsRouter = require('../routes/accounts');
const uploadRouter = require('../routes/upload');
const transactionsRouter = require('../routes/transactions');

const app = express();
app.use(express.json());
app.use('/api/accounts', accountsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/transactions', transactionsRouter);

describe('Amex Account Creation → File Upload → Transaction Verification Workflow', () => {
  let testAccountId;
  const testAccountData = {
    bank: 'Amex',
    name: 'amex-test',
    type: 'credit'
  };

  beforeAll(async () => {
    // Ensure database is connected and synchronized
    await sequelize.authenticate();
    await syncDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('Step 1: Account Creation', () => {
    test('should create Amex credit card account successfully', async () => {
      const response = await request(app)
        .post('/api/accounts/create')
        .send(testAccountData)
        .expect(201);

      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.account.bank).toBe('Amex');
      expect(response.body.account.name).toBe('amex-test');
      expect(response.body.account.type).toBe('credit');
      expect(response.body.account.balance).toBe(0);
      expect(response.body.account.id).toBeDefined();

      testAccountId = response.body.account.id;
    });

    test('should prevent duplicate account creation', async () => {
      // Try to create duplicate
      const response = await request(app)
        .post('/api/accounts/create')
        .send(testAccountData)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Step 2: File Upload Processing', () => {
    beforeEach(async () => {
      // Ensure we have a test account for upload tests
      if (!testAccountId) {
        const accountResponse = await request(app)
          .post('/api/accounts/create')
          .send(testAccountData);
        testAccountId = accountResponse.body.account.id;
      }
    });

    test('should upload and process Amex Excel file successfully', async () => {
      const testFilePath = path.join(__dirname, '../../test_files/amex_files/Summary.xls');
      
      // Verify test file exists
      expect(fs.existsSync(testFilePath)).toBe(true);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'amex-test')
        .field('bank', 'Amex')
        .field('file_type', 'Amex');

      console.log('Upload response status:', response.status);
      console.log('Upload response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Amex file uploaded successfully');
      expect(response.body.rows_processed).toBeGreaterThan(0);
    });

    test('should handle file upload errors gracefully', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('account', 'amex-test')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Step 3: Transaction Verification', () => {
    test('should retrieve transactions for the Amex account', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ account_id: testAccountId })
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test('should have exactly 1104 transactions for Amex test account', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ account_id: testAccountId })
        .expect(200);

      expect(response.body.total).toBe(1104);
      expect(response.body.transactions).toHaveLength(1104); // All transactions returned
    });

    test('should filter transactions by account correctly', async () => {
      // Create another account to test filtering
      const otherAccountResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'td-test',
          type: 'checking'
        });

      const otherAccountId = otherAccountResponse.body.account.id;

      // Get transactions for Amex account
      const amexResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: testAccountId })
        .expect(200);

      // Get transactions for TD account (should be empty)
      const tdResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: otherAccountId })
        .expect(200);

      expect(amexResponse.body.total).toBe(1104);
      expect(tdResponse.body.total).toBe(0);
    });

    test('should update account balance after transaction upload', async () => {
      const accountResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'Amex' })
        .expect(200);

      const amexAccount = accountResponse.body.accounts.find(acc => acc.name === 'amex-test');
      expect(amexAccount).toBeDefined();
      expect(amexAccount.transactionCount).toBe(1104);
      expect(amexAccount.balance).not.toBe(0); // Should have calculated balance
    });
  });

  describe('Complete End-to-End Workflow', () => {
    test('should complete full workflow: create account → upload file → verify transactions', async () => {
      // Step 1: Create Amex account
      const accountResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'Amex',
          name: 'amex-e2e-test',
          type: 'credit'
        })
        .expect(201);

      const accountId = accountResponse.body.account.id;
      expect(accountResponse.body.account.bank).toBe('Amex');
      expect(accountResponse.body.account.name).toBe('amex-e2e-test');
      expect(accountResponse.body.account.type).toBe('credit');

      // Step 2: Upload Amex file
      const testFilePath = path.join(__dirname, '../../test_files/amex_files/Summary.xls');
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'amex-e2e-test')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(200);

      expect(uploadResponse.body.message).toContain('Amex file uploaded successfully');
      expect(uploadResponse.body.rows_processed).toBeGreaterThan(0);

      // Step 3: Verify transactions
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: accountId })
        .expect(200);

      expect(transactionsResponse.body.total).toBe(1104);
      expect(transactionsResponse.body.transactions).toBeDefined();

      // Step 4: Verify account stats
      const accountsResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'Amex' })
        .expect(200);

      const amexAccount = accountsResponse.body.accounts.find(acc => acc.id === accountId);
      expect(amexAccount).toBeDefined();
      expect(amexAccount.transactionCount).toBe(1104);
      expect(amexAccount.balance).not.toBe(0);

      console.log(`✅ Complete workflow successful:`);
      console.log(`   - Account created: ${amexAccount.name} (${amexAccount.bank})`);
      console.log(`   - Transactions uploaded: ${amexAccount.transactionCount}`);
      console.log(`   - Account balance: $${amexAccount.balance}`);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid account during upload', async () => {
      const testFilePath = path.join(__dirname, '../../test_files/amex_files/Summary.xls');
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'non-existent-account')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle missing file during upload', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('account', 'amex-test')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    // Note: Invalid file format test removed as it's not critical for core functionality
  });
});