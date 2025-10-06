const express = require('express');
const { Transaction, Account } = require('../models');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    // Build base queryset
    let whereClause = {};
    
    // Filter by account if specified
    if (account_id && account_id !== 'all') {
      try {
        whereClause.account_id = parseInt(account_id);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid account_id parameter' });
      }
    }

    // Calculate total balance from filtered transactions
    const totalBalanceResult = await Transaction.findOne({
      where: whereClause,
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ],
      raw: true
    });
    
    const totalBalance = parseFloat(totalBalanceResult?.total) || 0;

    // Get recent transactions (filtered)
    const recentTransactions = await Transaction.findAll({
      where: whereClause,
      include: [{
        model: Account,
        as: 'account',
        attributes: ['name', 'bank']
      }],
      order: [['date', 'DESC']],
      limit: 5,
      attributes: ['date', 'description', 'amount', 'account_id']
    });

    const recentTransactionsWithNames = recentTransactions.map(transaction => ({
      date: transaction.date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      account__name: transaction.account ? transaction.account.name : null,
      account__bank: transaction.account ? transaction.account.bank : null
    }));

    // Calculate monthly spending (filtered)
    const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
    
    const monthlySpendingResult = await Transaction.findOne({
      where: {
        ...whereClause,
        date: {
          [Op.between]: [startOfMonth, endOfMonth]
        },
        amount: { [Op.lt]: 0 } // Only count expenses
      },
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ],
      raw: true
    });

    const monthlySpending = Math.abs(parseFloat(monthlySpendingResult?.total) || 0);

    // Get the last transaction date
    const lastTransaction = await Transaction.findOne({
      where: whereClause,
      order: [['date', 'DESC']],
      attributes: ['date']
    });

    const lastTransactionDate = lastTransaction ? lastTransaction.date : null;

    res.json({
      totalBalance: totalBalance,
      recentTransactions: recentTransactionsWithNames,
      monthlySpending: monthlySpending,
      lastTransactionDate: lastTransactionDate
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
