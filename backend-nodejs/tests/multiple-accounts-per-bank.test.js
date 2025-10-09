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

describe('Multiple Accounts Per Bank Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected and synchronized
    await sequelize.authenticate();
    await syncDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('TD Bank Multiple Accounts', () => {
    let tdAccountIds = {};

    test('should allow multiple accounts for TD bank', async () => {
      const tdAccounts = [
        { name: 'td-checking', type: 'checking' },
        { name: 'td-savings', type: 'savings' },
        { name: 'td-credit', type: 'credit' }
      ];

      for (const account of tdAccounts) {
        const response = await request(app)
          .post('/api/accounts/create')
          .send({
            bank: 'TD',
            name: account.name,
            type: account.type
          })
          .expect(201);

        expect(response.body.account.bank).toBe('TD');
        expect(response.body.account.name).toBe(account.name);
        expect(response.body.account.type).toBe(account.type);

        tdAccountIds[account.name] = response.body.account.id;
      }

      // Verify all accounts exist
      const accountsResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'TD' })
        .expect(200);

      expect(accountsResponse.body.accounts.length).toBeGreaterThanOrEqual(3);
      
      // Verify each account type exists
      const accountNames = accountsResponse.body.accounts.map(acc => acc.name);
      expect(accountNames).toContain('td-checking');
      expect(accountNames).toContain('td-savings');
      expect(accountNames).toContain('td-credit');

      console.log('✅ TD multiple accounts created successfully');
    });

    test('should prevent duplicate account names within same bank', async () => {
      const response = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'td-checking', // Already exists
          type: 'checking'
        })
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    test('should allow same account name for different banks', async () => {
      // Create checking account for TD
      const tdResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'checking-account',
          type: 'checking'
        })
        .expect(201);

      // Create checking account for Amex (same name, different bank)
      const amexResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'Amex',
          name: 'checking-account',
          type: 'credit'
        })
        .expect(201);

      expect(tdResponse.body.account.name).toBe('checking-account');
      expect(amexResponse.body.account.name).toBe('checking-account');
      expect(tdResponse.body.account.bank).toBe('TD');
      expect(amexResponse.body.account.bank).toBe('Amex');

      console.log('✅ Same account name allowed for different banks');
    });

    test('should upload transactions to specific TD accounts', async () => {
      const testFilePath = path.join(__dirname, '../../test_files/td_files/accountactivity.csv');
      
      // Upload to td-checking account
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'td-checking')
        .field('bank', 'TD')
        .field('file_type', 'TD')
        .expect(200);

      expect(response.body.message).toContain('TD file uploaded successfully');
      expect(response.body.rows_processed).toBeGreaterThan(0);

      // Verify transactions are associated with correct account
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: tdAccountIds['td-checking'] })
        .expect(200);

      expect(transactionsResponse.body.total).toBeGreaterThan(0);
      
      // Verify all transactions belong to td-checking account
      transactionsResponse.body.transactions.forEach(transaction => {
        expect(transaction.accountName).toContain('td-checking');
      });

      console.log('✅ Transactions uploaded to specific TD account');
    });
  });

  describe('Amex Bank Multiple Accounts', () => {
    let amexAccountIds = {};

    test('should allow multiple accounts for Amex bank', async () => {
      const amexAccounts = [
        { name: 'amex-gold', type: 'credit' },
        { name: 'amex-platinum', type: 'credit' },
        { name: 'amex-business', type: 'credit' }
      ];

      for (const account of amexAccounts) {
        const response = await request(app)
          .post('/api/accounts/create')
          .send({
            bank: 'Amex',
            name: account.name,
            type: account.type
          })
          .expect(201);

        expect(response.body.account.bank).toBe('Amex');
        expect(response.body.account.name).toBe(account.name);
        expect(response.body.account.type).toBe(account.type);

        amexAccountIds[account.name] = response.body.account.id;
      }

      // Verify all accounts exist
      const accountsResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'Amex' })
        .expect(200);

      expect(accountsResponse.body.accounts.length).toBeGreaterThanOrEqual(3);
      
      const accountNames = accountsResponse.body.accounts.map(acc => acc.name);
      expect(accountNames).toContain('amex-gold');
      expect(accountNames).toContain('amex-platinum');
      expect(accountNames).toContain('amex-business');

      console.log('✅ Amex multiple accounts created successfully');
    });

    test('should upload transactions to specific Amex accounts', async () => {
      const testFilePath = path.join(__dirname, '../../test_files/amex_files/Summary.xls');
      
      // Upload to amex-gold account
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'amex-gold')
        .field('bank', 'Amex')
        .field('file_type', 'Amex')
        .expect(200);

      expect(response.body.message).toContain('Amex file uploaded successfully');
      expect(response.body.rows_processed).toBeGreaterThan(0);

      // Verify transactions are associated with correct account
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: amexAccountIds['amex-gold'] })
        .expect(200);

      expect(transactionsResponse.body.total).toBeGreaterThan(0);
      
      // Verify all transactions belong to amex-gold account
      transactionsResponse.body.transactions.forEach(transaction => {
        expect(transaction.accountName).toContain('amex-gold');
      });

      console.log('✅ Transactions uploaded to specific Amex account');
    });
  });

  describe('Scotiabank Multiple Accounts', () => {
    let scotiaAccountIds = {};

    test('should allow multiple accounts for Scotiabank', async () => {
      const scotiaAccounts = [
        { name: 'scotia-checking', type: 'checking' },
        { name: 'scotia-savings', type: 'savings' },
        { name: 'scotia-visa', type: 'credit' }
      ];

      for (const account of scotiaAccounts) {
        const response = await request(app)
          .post('/api/accounts/create')
          .send({
            bank: 'Scotiabank',
            name: account.name,
            type: account.type
          })
          .expect(201);

        expect(response.body.account.bank).toBe('Scotiabank');
        expect(response.body.account.name).toBe(account.name);
        expect(response.body.account.type).toBe(account.type);

        scotiaAccountIds[account.name] = response.body.account.id;
      }

      // Verify all accounts exist
      const accountsResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'Scotiabank' })
        .expect(200);

      expect(accountsResponse.body.accounts.length).toBeGreaterThanOrEqual(3);
      
      const accountNames = accountsResponse.body.accounts.map(acc => acc.name);
      expect(accountNames).toContain('scotia-checking');
      expect(accountNames).toContain('scotia-savings');
      expect(accountNames).toContain('scotia-visa');

      console.log('✅ Scotiabank multiple accounts created successfully');
    });

    test('should upload transactions to specific Scotiabank accounts', async () => {
      const testFilePath = path.join(__dirname, '../../test_files/scotiabank/Scotiabank_Platinum_Amex_Card_3953_091925.csv');
      
      // Upload to scotia-visa account
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'scotia-visa')
        .field('bank', 'Scotiabank')
        .field('file_type', 'Scotiabank')
        .expect(200);

      expect(response.body.message).toContain('Scotiabank file uploaded successfully');
      expect(response.body.rows_processed).toBeGreaterThan(0);

      // Verify transactions are associated with correct account
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: scotiaAccountIds['scotia-visa'] })
        .expect(200);

      expect(transactionsResponse.body.total).toBeGreaterThan(0);
      
      // Verify all transactions belong to scotia-visa account
      transactionsResponse.body.transactions.forEach(transaction => {
        expect(transaction.accountName).toContain('scotia-visa');
      });

      console.log('✅ Transactions uploaded to specific Scotiabank account');
    });
  });

  describe('Cross-Bank Account Management', () => {
    test('should maintain separate balances for multiple accounts per bank', async () => {
      // Get all accounts
      const allAccountsResponse = await request(app)
        .get('/api/accounts')
        .expect(200);

      const accounts = allAccountsResponse.body.accounts;
      
      // Group accounts by bank
      const accountsByBank = {};
      accounts.forEach(account => {
        if (!accountsByBank[account.bank]) {
          accountsByBank[account.bank] = [];
        }
        accountsByBank[account.bank].push(account);
      });

      // Verify each bank has multiple accounts
      expect(accountsByBank.TD.length).toBeGreaterThanOrEqual(3);
      expect(accountsByBank.Amex.length).toBeGreaterThanOrEqual(3);
      expect(accountsByBank.Scotiabank.length).toBeGreaterThanOrEqual(3);

      // Verify accounts have different balances (if transactions uploaded)
      const tdAccounts = accountsByBank.TD;
      const amexAccounts = accountsByBank.Amex;
      const scotiaAccounts = accountsByBank.Scotiabank;

      // Check that accounts with transactions have different balances
      const tdWithTransactions = tdAccounts.filter(acc => acc.transactionCount > 0);
      const amexWithTransactions = amexAccounts.filter(acc => acc.transactionCount > 0);
      const scotiaWithTransactions = scotiaAccounts.filter(acc => acc.transactionCount > 0);

      if (tdWithTransactions.length > 1) {
        const balances = tdWithTransactions.map(acc => acc.balance);
        expect(new Set(balances).size).toBeGreaterThan(1); // Different balances
      }

      console.log('✅ Multiple accounts per bank maintain separate balances');
    });

    test('should filter transactions correctly by specific account', async () => {
      // Test filtering by specific account IDs
      const allAccountsResponse = await request(app)
        .get('/api/accounts')
        .expect(200);

      const accounts = allAccountsResponse.body.accounts;
      
      // Find accounts with transactions
      const accountsWithTransactions = accounts.filter(acc => acc.transactionCount > 0);
      
      expect(accountsWithTransactions.length).toBeGreaterThan(0);

      // Test filtering for each account with transactions
      for (const account of accountsWithTransactions) {
        const transactionsResponse = await request(app)
          .get('/api/transactions')
          .query({ account_id: account.id })
          .expect(200);

        expect(transactionsResponse.body.total).toBe(account.transactionCount);
        
        // Verify all transactions belong to this specific account
        transactionsResponse.body.transactions.forEach(transaction => {
          expect(transaction.accountName).toContain(account.name);
        });
      }

      console.log('✅ Transaction filtering by specific account working correctly');
    });

    test('should handle account deletion with multiple accounts per bank', async () => {
      // Create a test account for deletion
      const testAccountResponse = await request(app)
        .post('/api/accounts/create')
        .send({
          bank: 'TD',
          name: 'td-delete-test',
          type: 'checking'
        })
        .expect(201);

      const testAccountId = testAccountResponse.body.account.id;

      // Upload some transactions to this account
      const testFilePath = path.join(__dirname, '../../test_files/td_files/accountactivity.csv');
      await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('account', 'td-delete-test')
        .field('bank', 'TD')
        .field('file_type', 'TD')
        .expect(200);

      // Verify account has transactions
      const beforeDeleteResponse = await request(app)
        .get('/api/transactions')
        .query({ account_id: testAccountId })
        .expect(200);

      expect(beforeDeleteResponse.body.total).toBeGreaterThan(0);

      // Delete the account
      const deleteResponse = await request(app)
        .delete(`/api/accounts/${testAccountId}/delete`)
        .expect(200);

      expect(deleteResponse.body.message).toContain('deleted successfully');

      // Verify account is deleted
      const afterDeleteResponse = await request(app)
        .get('/api/accounts')
        .query({ bank: 'TD' })
        .expect(200);

      const deletedAccount = afterDeleteResponse.body.accounts.find(acc => acc.name === 'td-delete-test');
      expect(deletedAccount).toBeUndefined();

      // Verify other TD accounts still exist
      const remainingAccounts = afterDeleteResponse.body.accounts;
      expect(remainingAccounts.length).toBeGreaterThan(0);

      console.log('✅ Account deletion with multiple accounts per bank working correctly');
    });
  });
});
