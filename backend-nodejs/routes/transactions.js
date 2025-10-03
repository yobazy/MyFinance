const express = require('express');
const { Transaction, Category, Account } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { uncategorized, account_id, limit = 100, offset = 0 } = req.query;
    
    let whereClause = {};
    
    // Filter for uncategorized transactions if requested
    if (uncategorized === 'true') {
      whereClause.categoryId = null;
    }
    
    // Filter by account if specified
    if (account_id && account_id !== 'all') {
      whereClause.accountId = parseInt(account_id);
    }

    const transactions = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'bank']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'suggestedCategory',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const transactionsWithNames = transactions.rows.map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      source: transaction.source,
      account: transaction.accountId,
      accountName: transaction.account ? `${transaction.account.bank} - ${transaction.account.name}` : null,
      category: transaction.categoryId,
      categoryName: transaction.category ? transaction.category.name : null,
      autoCategorized: transaction.autoCategorized,
      confidenceScore: transaction.confidenceScore,
      suggestedCategory: transaction.suggestedCategoryId,
      suggestedCategoryName: transaction.suggestedCategory ? transaction.suggestedCategory.name : null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }));

    res.json({
      transactions: transactionsWithNames,
      total: transactions.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transactions missing categories
router.get('/missing-categories', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { categoryId: null },
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'bank']
        }
      ],
      order: [['date', 'DESC']]
    });

    const transactionsWithNames = transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      source: transaction.source,
      account: transaction.accountId,
      accountName: transaction.account ? `${transaction.account.bank} - ${transaction.account.name}` : null,
      category: transaction.categoryId,
      categoryName: null,
      autoCategorized: transaction.autoCategorized,
      confidenceScore: transaction.confidenceScore,
      suggestedCategory: transaction.suggestedCategoryId,
      suggestedCategoryName: null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }));

    res.json(transactionsWithNames);
  } catch (error) {
    console.error('Error fetching uncategorized transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transaction category
router.put('/:transactionId/update-category', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const categoryRecord = await Category.findByPk(category);
    if (!categoryRecord) {
      return res.status(400).json({ error: 'Category not found' });
    }

    // Update the original transaction
    transaction.categoryId = category;
    await transaction.save();

    // Find and update all other transactions with the same description
    const description = transaction.description;
    const otherTransactions = await Transaction.findAll({
      where: {
        description: description,
        id: { [Op.ne]: transactionId }
      }
    });

    // Update all matching transactions
    const updatedCount = await Transaction.update(
      { categoryId: category },
      {
        where: {
          description: description,
          id: { [Op.ne]: transactionId }
        }
      }
    );

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        source: transaction.source,
        account: transaction.accountId,
        category: transaction.categoryId,
        categoryName: categoryRecord.name,
        autoCategorized: transaction.autoCategorized,
        confidenceScore: transaction.confidenceScore,
        suggestedCategory: transaction.suggestedCategoryId,
        suggestedCategoryName: null,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      },
      message: `Updated ${updatedCount[0] + 1} transactions with the same description`,
      updatedCount: updatedCount[0] + 1
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by ID
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'bank']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'suggestedCategory',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      source: transaction.source,
      account: transaction.accountId,
      accountName: transaction.account ? `${transaction.account.bank} - ${transaction.account.name}` : null,
      category: transaction.categoryId,
      categoryName: transaction.category ? transaction.category.name : null,
      autoCategorized: transaction.autoCategorized,
      confidenceScore: transaction.confidenceScore,
      suggestedCategory: transaction.suggestedCategoryId,
      suggestedCategoryName: transaction.suggestedCategory ? transaction.suggestedCategory.name : null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await transaction.destroy();

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update transaction categories
router.put('/bulk-update-categories', async (req, res) => {
  try {
    const { transactionIds, categoryId } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs array is required' });
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const updatedCount = await Transaction.update(
      { categoryId: categoryId },
      {
        where: {
          id: { [Op.in]: transactionIds }
        }
      }
    );

    res.json({
      message: `Successfully updated ${updatedCount[0]} transactions`,
      updatedCount: updatedCount[0]
    });
  } catch (error) {
    console.error('Error bulk updating transaction categories:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
