const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database and models
const { sequelize, testConnection, syncDatabase } = require('./models');

// Import routes
const uploadRoutes = require('./routes/upload');
const accountRoutes = require('./routes/accounts');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');
const visualizationRoutes = require('./routes/visualizations');
const dashboardRoutes = require('./routes/dashboard');
const ruleRoutes = require('./routes/rules');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/upload', uploadRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/backup', backupRoutes);

// Database reset endpoint (for development)
app.post('/api/reset-database', async (req, res) => {
  try {
    // Delete all data in correct order to avoid foreign key constraints
    const { Transaction, TDTransaction, AmexTransaction, ScotiabankTransaction, 
            CategorizationRule, RuleUsage, RuleGroup, Category, Account } = require('./models');
    
    await Transaction.destroy({ where: {} });
    await TDTransaction.destroy({ where: {} });
    await AmexTransaction.destroy({ where: {} });
    await ScotiabankTransaction.destroy({ where: {} });
    await CategorizationRule.destroy({ where: {} });
    await RuleUsage.destroy({ where: {} });
    await RuleGroup.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await Account.destroy({ where: {} });
    
    // Sync database to recreate tables
    await syncDatabase();
    
    res.json({ 
      message: 'Database reset and migrations applied! All data including categories, rules, and transactions have been deleted. Backup records and settings have been preserved.' 
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database
    await syncDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 MyFinance Backend Server running on port ${PORT}`);
      console.log(`📡 API available at: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
