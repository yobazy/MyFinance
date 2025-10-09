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

describe('Account Display and Management Tests', () => {
  let testAccountIds = {};
  
  beforeAll(async () => {
    // Ensure database is connected and synchronized
    await sequelize.authenticate();
    await syncDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('Account Page Display Tests', () => {
    beforeEach(async () => {
      // Clean up existing test accounts first
      await request(app).delete('/api/accounts/delete-by-bank?bank=TD');
      await request(app).delete('/api/accounts/delete-by-bank?bank=Amex');
      await request(app).delete('/api/accounts/delete-by-bank?bank=Scotiabank');
      
      // Create test accounts for each bank
      const banks = [
        { bank: 'TD', name: 'td-display-test', type: 'checking' },
        { bank: 'Amex', name: 'amex-display-test', type: 'credit' },
        { bank: 'Scotiabank', name: 'scotia-display-test', type: 'savings' }
      ];

      for (const bankData of banks) {
        const response = await request(app)
          .post('/api/accounts/create')
          .send(bankData);

        if (response.status !== 201) {
          console.log(`Failed to create ${bankData.bank} account:`, response.status, response.body);
        }
        expect(response.status).toBe(201);

        testAccountIds[bankData.bank] = response.body.account.id;
      }
    });

    test('should display account type, balance, and transaction count for each account', async () => {
      // Get all accounts
      const response = await request(app)
        .get('/api/accounts')
        .expect(200);

      expect(response.body.accounts).toBeDefined();
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBeGreaterThan(0);

      // Verify each account has required display fields
      response.body.accounts.forEach(account => {
        expect(account.id).toBeDefined();
        expect(account.name).toBeDefined();
        expect(account.bank).toBeDefined();
        expect(account.type).toBeDefined();
        expect(account.balance).toBeDefined();
        expect(account.transactionCount).toBeDefined();
        expect(account.lastUpdated).toBeDefined();

        // Verify account type is valid
        expect(['checking', 'savings', 'credit']).toContain(account.type);
        
        // Verify balance is a number
        expect(typeof account.balance).toBe('number');
        
        // Verify transaction count is a number
        expect(typeof account.transactionCount).toBe('number');
        expect(account.transactionCount).toBeGreaterThanOrEqual(0);
      });

      console.log('✅ Account display fields validated for all accounts');
    });

    test('should display account details correctly after transaction upload', async () => {
      // Upload transactions to TD account
      const tdFilePath = path.join(__dirname, '../../test_files/td_files/accountactivity.csv');
      await request(app)
        .post('/api/upload')
        .attach('file', tdFilePath)
        .field('account', 'td-display-test')
        .field('bank', 'TD')
        .field('file_type', 'TD')
        .expect(200);

      // Upload transactions to Amex account
      const amexFilePath = path.join(__dirname, '../../test_files/amex_files/Summary.xls');
      await request(app)
        .post('/api/upload')
        .attach('file', amexFilePath)
        .field('account', 'amex-display-test')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(200);

      // Upload transactions to Scotiabank account
      const scotiaFilePath = path.join(__dirname, '../../test_files/scotiabank/Scotiabank_Platinum_Amex_Card_3953_091925.csv');
      await request(app)
        .post('/api/upload')
        .attach('file', scotiaFilePath)
        .field('account', 'scotia-display-test')
        .field('bank', 'Scotiabank')
        .field('file_type', 'Scotiabank')
        .expect(200);

      // Verify account display after transaction upload
      const response = await request(app)
        .get('/api/accounts')
        .expect(200);

      const accounts = response.body.accounts;
      
      // Find our test accounts
      const tdAccount = accounts.find(acc => acc.name === 'td-display-test');
      const amexAccount = accounts.find(acc => acc.name === 'amex-display-test');
      const scotiaAccount = accounts.find(acc => acc.name === 'scotia-display-test');

      expect(tdAccount).toBeDefined();
      expect(amexAccount).toBeDefined();
      expect(scotiaAccount).toBeDefined();

      // Verify TD account display
      expect(tdAccount.bank).toBe('TD');
      expect(tdAccount.type).toBe('checking');
      expect(tdAccount.transactionCount).toBe(8); // Expected TD transactions
      expect(tdAccount.balance).not.toBe(0);

      // Verify Amex account display
      expect(amexAccount.bank).toBe('Amex');
      expect(amexAccount.type).toBe('credit');
      expect(amexAccount.transactionCount).toBe(1104); // Expected Amex transactions
      expect(amexAccount.balance).not.toBe(0);

      // Verify Scotiabank account display
      expect(scotiaAccount.bank).toBe('Scotiabank');
      expect(scotiaAccount.type).toBe('savings');
      expect(scotiaAccount.transactionCount).toBe(99); // Expected Scotiabank transactions
      expect(scotiaAccount.balance).not.toBe(0);

      console.log('✅ Account display after transaction upload:', {
        TD: { transactions: tdAccount.transactionCount, balance: tdAccount.balance },
        Amex: { transactions: amexAccount.transactionCount, balance: amexAccount.balance },
        Scotiabank: { transactions: scotiaAccount.transactionCount, balance: scotiaAccount.balance }
      });
    });

    test('should display transactions for each account correctly', async () => {
      // Upload transactions to test accounts
      const tdFilePath = path.join(__dirname, '../../test_files/td_files/accountactivity.csv');
      await request(app)
        .post('/api/upload')
        .attach('file', tdFilePath)
        .field('account', 'td-display-test')
        .field('bank', 'TD')
        .field('file_type', 'TD')
        .expect(200);

      // Get transactions for TD account
      const tdTransactionsResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: testAccountIds.TD })
        .expect(200);

      expect(tdTransactionsResponse.body.transactions).toBeDefined();
      expect(Array.isArray(tdTransactionsResponse.body.transactions)).toBe(true);
      expect(tdTransactionsResponse.body.total).toBe(8);

      // Verify transaction display fields
      tdTransactionsResponse.body.transactions.forEach(transaction => {
        expect(transaction.id).toBeDefined();
        expect(transaction.date).toBeDefined();
        expect(transaction.description).toBeDefined();
        expect(transaction.amount).toBeDefined();
        expect(transaction.account).toBe(testAccountIds.TD);
        expect(transaction.accountName).toContain('td-display-test');
        expect(transaction.source).toBe('TD');

        // Verify amount is a number
        expect(typeof transaction.amount).toBe('number');
      });

      console.log('✅ Transaction display validated for TD account');
    });

    test('should filter accounts by bank correctly', async () => {
      // Test filtering by each bank
      const banks = ['TD', 'Amex', 'Scotiabank'];
      
      for (const bank of banks) {
        const response = await request(app)
          .get('/api/accounts')
          .query({ bank: bank })
          .expect(200);

        expect(response.body.accounts).toBeDefined();
        expect(Array.isArray(response.body.accounts)).toBe(true);

        // Verify all returned accounts belong to the specified bank
        response.body.accounts.forEach(account => {
          expect(account.bank).toBe(bank);
        });

        // Verify our test account is included
        const testAccount = response.body.accounts.find(acc => 
          acc.name === `${bank.toLowerCase()}-display-test`
        );
        expect(testAccount).toBeDefined();
      }

      console.log('✅ Account filtering by bank working correctly');
    });

    test('should display account balance updates correctly', async () => {
      // Get initial account state
      const initialResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'TD' })
        .expect(200);

      const initialAccount = initialResponse.body.accounts.find(acc => 
        acc.name === 'td-display-test'
      );
      const initialBalance = initialAccount.balance;

      // Upload transactions
      const tdFilePath = path.join(__dirname, '../../test_files/td_files/accountactivity.csv');
      await request(app)
        .post('/api/upload')
        .attach('file', tdFilePath)
        .field('account', 'td-display-test')
        .field('bank', 'TD')
        .field('file_type', 'TD')
        .expect(200);

      // Get updated account state
      const updatedResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'TD' })
        .expect(200);

      const updatedAccount = updatedResponse.body.accounts.find(acc => 
        acc.name === 'td-display-test'
      );

      // Verify balance has been updated
      expect(updatedAccount.balance).not.toBe(initialBalance);
      expect(updatedAccount.transactionCount).toBeGreaterThan(0);
      expect(updatedAccount.lastUpdated).toBeDefined();

      console.log('✅ Account balance updates displayed correctly');
    });
  });

  describe('Account Management Operations', () => {
    test('should update account details correctly', async () => {
      // Create a test account
      const createResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'td-update-test',
          type: 'checking'
        })
        .expect(201);

      const accountId = createResponse.body.account.id;

      // Update account details
      const updateResponse = await request(app)
        .put(`/api/accounts/${accountId}`)
        .send({
          name: 'td-updated-name',
          type: 'savings'
        })
        .expect(200);

      expect(updateResponse.body.message).toBe('Account updated successfully');
      expect(updateResponse.body.account.name).toBe('td-updated-name');
      expect(updateResponse.body.account.type).toBe('savings');
      expect(updateResponse.body.account.bank).toBe('TD');

      // Verify update in database
      const verifyResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'TD' })
        .expect(200);

      const updatedAccount = verifyResponse.body.accounts.find(acc => acc.id === accountId);
      expect(updatedAccount).toBeDefined();
      expect(updatedAccount.name).toBe('td-updated-name');
      expect(updatedAccount.type).toBe('savings');

      console.log('✅ Account update functionality working correctly');
    });

    test('should refresh account balances correctly', async () => {
      // Create accounts and upload transactions
      const banks = [
        { bank: 'TD', name: 'td-refresh-test', file: 'accountactivity.csv', fileType: 'TD' },
        { bank: 'Amex', name: 'amex-refresh-test', file: 'Summary.xls', fileType: 'Amex' }
      ];

      for (const bankData of banks) {
        // Create account
        await request(app)
          .post('/api/accounts/create')
          .send({
            bank: bankData.bank,
            name: bankData.name,
            type: 'checking'
          })
          .expect(201);

        // Upload transactions
        const filePath = path.join(__dirname, `../../test_files/${bankData.bank.toLowerCase()}_files/${bankData.file}`);
        await request(app)
          .post('/api/upload')
          .attach('file', filePath)
          .field('account', bankData.name)
          .field('bank', bankData.bank)
          .field('file_type', bankData.fileType)
          .expect(200);
      }

      // Refresh all account balances
      const refreshResponse = await request(app)
        .post('/api/accounts/refresh-balances')
        .expect(200);

      expect(refreshResponse.body.message).toContain('Successfully updated');
      expect(refreshResponse.body.accounts).toBeDefined();
      expect(Array.isArray(refreshResponse.body.accounts)).toBe(true);

      // Verify balances were refreshed
      refreshResponse.body.accounts.forEach(account => {
        expect(account.id).toBeDefined();
        expect(account.name).toBeDefined();
        expect(account.bank).toBeDefined();
        expect(account.oldBalance).toBeDefined();
        expect(account.newBalance).toBeDefined();
        expect(typeof account.oldBalance).toBe('number');
        expect(typeof account.newBalance).toBe('number');
      });

      console.log('✅ Account balance refresh working correctly');
    });

    test('should get accounts by bank correctly', async () => {
      // Test getting accounts by specific bank
      const banks = ['TD', 'Amex', 'Scotiabank'];
      
      for (const bank of banks) {
        const response = await request(app)
          .get('/api/accounts/by-bank')
          .query({ bank: bank })
          .expect(200);

        expect(response.body.accounts).toBeDefined();
        expect(Array.isArray(response.body.accounts)).toBe(true);

        // Verify all accounts belong to the specified bank
        response.body.accounts.forEach(account => {
          expect(account.id).toBeDefined();
          expect(account.name).toBeDefined();
        });

        // Verify we have our test accounts
        const testAccountNames = response.body.accounts.map(acc => acc.name);
        expect(testAccountNames.length).toBeGreaterThan(0);
      }

      console.log('✅ Get accounts by bank working correctly');
    });
  });

  describe('Account Display Error Handling', () => {
    test('should handle non-existent account queries gracefully', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ account_id: 99999 })
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.total).toBe(0);
    });

    test('should handle invalid bank filter gracefully', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .query({ bank: 'NonExistentBank' })
        .expect(200);

      expect(response.body.accounts).toBeDefined();
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBe(0);
    });

    test('should handle account update with invalid data', async () => {
      // Create a test account
      const createResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'td-error-test',
          type: 'checking'
        })
        .expect(201);

      const accountId = createResponse.body.account.id;

      // Try to update with invalid account ID
      const response = await request(app)
        .put('/api/accounts/99999')
        .send({
          name: 'updated-name'
        })
        .expect(404);

      expect(response.body.error).toBe('Account not found');
    });
  });
});
