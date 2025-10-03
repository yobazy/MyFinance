const express = require('express');
const { Transaction, Category } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Get visualization data
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, account_id } = req.query;

    // Determine sensible defaults
    const firstTransaction = await Transaction.findOne({
      order: [['date', 'ASC']],
      attributes: ['date']
    });
    
    const defaultStart = firstTransaction ? 
      moment(firstTransaction.date).format('YYYY-MM-DD') : 
      moment().startOf('year').format('YYYY-MM-DD');
    const defaultEnd = moment().format('YYYY-MM-DD');

    const startDate = start_date || defaultStart;
    const endDate = end_date || defaultEnd;

    // Build where clause
    let whereClause = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    // Filter by account if specified
    if (account_id && account_id !== 'all') {
      whereClause.accountId = parseInt(account_id);
    }

    // Get all transactions within the date range
    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name']
      }]
    });

    // Only expenses for category pie (positive values for charting)
    const expenses = transactions.filter(t => parseFloat(t.amount) > 0);

    // Category spending
    const categorySpending = {};
    expenses.forEach(transaction => {
      const categoryName = transaction.category ? transaction.category.name : 'Uncategorized';
      if (!categorySpending[categoryName]) {
        categorySpending[categoryName] = 0;
      }
      categorySpending[categoryName] += parseFloat(transaction.amount);
    });

    const categorySpendingArray = Object.entries(categorySpending)
      .map(([name, total_amount]) => ({ 'category__name': name, total_amount }))
      .sort((a, b) => b.total_amount - a.total_amount);

    // Monthly spending trend
    const monthlyTrend = {};
    expenses.forEach(transaction => {
      const month = moment(transaction.date).format('YYYY-MM');
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = 0;
      }
      monthlyTrend[month] += parseFloat(transaction.amount);
    });

    const monthlyTrendArray = Object.entries(monthlyTrend)
      .map(([month, total_amount]) => ({ month, total_amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Monthly income trend (negative amounts converted to positive)
    const income = transactions.filter(t => parseFloat(t.amount) < 0);
    const monthlyIncome = {};
    income.forEach(transaction => {
      const month = moment(transaction.date).format('YYYY-MM');
      if (!monthlyIncome[month]) {
        monthlyIncome[month] = 0;
      }
      monthlyIncome[month] += Math.abs(parseFloat(transaction.amount));
    });

    const monthlyIncomeArray = Object.entries(monthlyIncome)
      .map(([month, total_amount]) => ({ month, total_amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Category variance (standard deviation per category)
    const categoryVariance = {};
    const categoryNames = [...new Set(transactions.map(t => t.category ? t.category.name : 'Uncategorized'))];
    
    categoryNames.forEach(categoryName => {
      const categoryTransactions = transactions
        .filter(t => (t.category ? t.category.name : 'Uncategorized') === categoryName)
        .map(t => parseFloat(t.amount));
      
      if (categoryTransactions.length > 0) {
        const mean = categoryTransactions.reduce((sum, val) => sum + val, 0) / categoryTransactions.length;
        const variance = categoryTransactions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / categoryTransactions.length;
        categoryVariance[categoryName] = Math.sqrt(variance);
      } else {
        categoryVariance[categoryName] = 0;
      }
    });

    // Weekly spending patterns
    const weeklyPatterns = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    expenses.forEach(transaction => {
      const dayOfWeek = moment(transaction.date).day();
      const dayName = dayNames[dayOfWeek];
      
      if (!weeklyPatterns[dayName]) {
        weeklyPatterns[dayName] = { amount: 0, count: 0 };
      }
      weeklyPatterns[dayName].amount += parseFloat(transaction.amount);
      weeklyPatterns[dayName].count += 1;
    });

    const weeklyData = Object.entries(weeklyPatterns)
      .map(([day, data]) => ({
        day,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));

    // Top merchants analysis
    const merchantSpending = {};
    expenses.forEach(transaction => {
      const merchant = transaction.description;
      if (!merchantSpending[merchant]) {
        merchantSpending[merchant] = { amount: 0, count: 0 };
      }
      merchantSpending[merchant].amount += parseFloat(transaction.amount);
      merchantSpending[merchant].count += 1;
    });

    const topMerchants = Object.entries(merchantSpending)
      .map(([description, data]) => ({
        description,
        total_amount: data.amount,
        transaction_count: data.count
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);

    // Category spending trends over time (monthly)
    const categoryTrends = {};
    categoryNames.forEach(categoryName => {
      if (categoryName) {
        const categoryMonthly = {};
        expenses
          .filter(t => (t.category ? t.category.name : 'Uncategorized') === categoryName)
          .forEach(transaction => {
            const month = moment(transaction.date).format('YYYY-MM');
            if (!categoryMonthly[month]) {
              categoryMonthly[month] = 0;
            }
            categoryMonthly[month] += parseFloat(transaction.amount);
          });
        
        categoryTrends[categoryName] = Object.entries(categoryMonthly)
          .map(([month, total_amount]) => ({ month, total_amount }))
          .sort((a, b) => a.month.localeCompare(b.month));
      }
    });

    // Spending summary metrics
    const totalSpending = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const daysDiff = moment(endDate).diff(moment(startDate), 'days') + 1;
    const avgDailySpending = totalSpending / Math.max(1, daysDiff);
    const totalTransactions = expenses.length;

    // Month-over-month comparison
    let currentMonthSpending = 0;
    let previousMonthSpending = 0;
    
    if (monthlyTrendArray.length > 0) {
      currentMonthSpending = monthlyTrendArray[monthlyTrendArray.length - 1].total_amount;
      
      if (monthlyTrendArray.length > 1) {
        previousMonthSpending = monthlyTrendArray[monthlyTrendArray.length - 2].total_amount;
      }
    }

    const momChange = previousMonthSpending > 0 ? 
      ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100 : 0;

    // Unusual spending detection (transactions > 2 standard deviations from mean)
    let unusualTransactions = [];
    if (expenses.length > 0) {
      const amounts = expenses.map(t => parseFloat(t.amount));
      const meanAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - meanAmount, 2), 0) / amounts.length;
      const stdAmount = Math.sqrt(variance);
      const threshold = meanAmount + (2 * stdAmount);
      
      unusualTransactions = expenses
        .filter(t => parseFloat(t.amount) > threshold)
        .slice(0, 5)
        .map(t => ({
          date: t.date,
          description: t.description,
          amount: parseFloat(t.amount),
          category__name: t.category ? t.category.name : 'Uncategorized'
        }));
    }

    // Construct response
    const responseData = {
      category_spending: categorySpendingArray,
      monthly_trend: monthlyTrendArray,
      monthly_income: monthlyIncomeArray,
      category_variance: categoryVariance,
      weekly_patterns: weeklyData,
      top_merchants: topMerchants,
      category_trends: categoryTrends,
      summary_metrics: {
        total_spending: totalSpending,
        total_income: totalIncome,
        net_balance: totalIncome - totalSpending,
        avg_daily_spending: avgDailySpending,
        total_transactions: totalTransactions,
        mom_change_percent: Math.round(momChange * 100) / 100
      },
      unusual_transactions: unusualTransactions
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching visualization data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
