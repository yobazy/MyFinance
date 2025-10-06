const express = require('express');
const { Account, Transaction } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const { bank } = req.query;
    
    let whereClause = {};
    if (bank) {
      whereClause.bank = bank;
    }

    const accounts = await Account.findAll({
      where: whereClause,
      include: [{
        model: Transaction,
        as: 'transactions',
        attributes: ['id']
      }]
    });

    const accountsWithCounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      bank: account.bank,
      type: account.type,
      balance: parseFloat(account.balance),
      lastUpdated: account.lastUpdated,
      transactionCount: account.transactions ? account.transactions.length : 0
    }));

    res.json({ accounts: accountsWithCounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new account
router.post('/create', async (req, res) => {
  try {
    const { bank, name, type = 'checking' } = req.body;

    if (!bank || !name) {
      return res.status(400).json({ error: 'Bank and account name are required' });
    }

    // Check if account already exists for the same bank
    const existingAccount = await Account.findOne({
      where: { bank: bank, name: name }
    });

    if (existingAccount) {
      return res.status(400).json({ 
        error: `Account '${name}' already exists for ${bank}. Please choose a different name or bank.` 
      });
    }

    const account = await Account.create({
      bank: bank,
      name: name,
      type: type,
      balance: 0
    });

    res.status(201).json({
      message: 'Account created successfully',
      account: {
        id: account.id,
        name: account.name,
        bank: account.bank,
        type: account.type,
        balance: parseFloat(account.balance),
        lastUpdated: account.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    console.error('Error details:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message).join(', ') : 'Unknown error',
      type: error.name
    });
  }
});

// Update account
router.put('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { name, bank, type } = req.body;

    const account = await Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Update account fields
    if (name !== undefined) account.name = name;
    if (bank !== undefined) account.bank = bank;
    if (type !== undefined) account.type = type;

    await account.save();

    res.json({
      message: 'Account updated successfully',
      account: {
        id: account.id,
        name: account.name,
        bank: account.bank,
        type: account.type,
        balance: parseFloat(account.balance),
        lastUpdated: account.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:accountId/delete', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Count transactions before deletion for response message
    const transactionCount = await Transaction.count({
      where: { account_id: accountId }
    });

    // Delete all transactions associated with this account first
    if (transactionCount > 0) {
      await Transaction.destroy({
        where: { account_id: accountId }
      });
    }

    // Delete the account
    await account.destroy();

    const message = transactionCount > 0 
      ? `Account and ${transactionCount} associated transactions deleted successfully`
      : 'Account deleted successfully';

    res.json({ message });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh account balances
router.post('/refresh-balances', async (req, res) => {
  try {
    const accounts = await Account.findAll();
    const updatedAccounts = [];

    for (const account of accounts) {
      const oldBalance = parseFloat(account.balance);
      const newBalance = await account.updateBalance();
      
      updatedAccounts.push({
        id: account.id,
        name: account.name,
        bank: account.bank,
        oldBalance: oldBalance,
        newBalance: parseFloat(newBalance)
      });
    }

    res.json({
      message: `Successfully updated ${updatedAccounts.length} account balances`,
      accounts: updatedAccounts
    });
  } catch (error) {
    console.error('Error refreshing account balances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get account by bank
router.get('/by-bank', async (req, res) => {
  try {
    const { bank } = req.query;

    if (!bank) {
      return res.status(400).json({ error: 'Bank parameter is required' });
    }

    const accounts = await Account.findAll({
      where: { bank: bank },
      attributes: ['id', 'name']
    });

    res.json({ accounts: accounts });
  } catch (error) {
    console.error('Error fetching accounts by bank:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
