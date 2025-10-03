# Migration from Django to Node.js Backend

This document outlines the migration of the MyFinance Dashboard backend from Django to Node.js.

## Overview

The backend has been completely migrated from Django/Python to Node.js/Express.js while maintaining all existing functionality and API compatibility.

## New Architecture

- **Backend**: Node.js with Express.js
- **Database**: SQLite with Sequelize ORM
- **File Processing**: XLSX library for Excel files, CSV parser for CSV files
- **Desktop App**: Electron wrapper (unchanged)

## Directory Structure

```
backend-nodejs/
├── config/
│   └── database.js          # Database configuration
├── models/
│   ├── index.js            # Model initialization and associations
│   ├── Account.js          # Account model
│   ├── Category.js         # Category model
│   ├── Transaction.js      # Transaction model
│   ├── TDTransaction.js    # TD Bank transaction model
│   ├── AmexTransaction.js  # American Express transaction model
│   ├── ScotiabankTransaction.js # Scotiabank transaction model
│   ├── CategorizationRule.js # Auto-categorization rules
│   ├── RuleGroup.js        # Rule groups
│   ├── RuleUsage.js        # Rule usage tracking
│   ├── BackupSettings.js   # Backup configuration
│   └── DatabaseBackup.js   # Backup records
├── routes/
│   ├── upload.js           # File upload endpoints
│   ├── accounts.js         # Account management
│   ├── categories.js       # Category management
│   ├── transactions.js     # Transaction management
│   ├── visualizations.js   # Analytics and charts
│   ├── dashboard.js         # Dashboard data
│   ├── rules.js            # Auto-categorization rules
│   └── backup.js           # Database backup
├── package.json            # Node.js dependencies
└── server.js               # Main server file
```

## Key Features Migrated

### ✅ File Upload & Processing
- Multi-bank support (TD, Amex, Scotiabank)
- CSV and Excel file processing
- Automatic transaction parsing and storage
- Multiple file upload support

### ✅ Account Management
- Create, read, update, delete accounts
- Account balance calculation
- Bank-specific account handling

### ✅ Category Management
- Hierarchical categories with subcategories
- Category tree structure
- Transaction count tracking
- Color coding support

### ✅ Transaction Management
- Full CRUD operations
- Auto-categorization support
- Bulk operations
- Search and filtering

### ✅ Analytics & Visualizations
- Category spending breakdown
- Monthly trends
- Weekly patterns
- Top merchants analysis
- Unusual spending detection
- Summary metrics

### ✅ Auto-Categorization Rules
- Multiple rule types (keyword, amount, regex, etc.)
- Rule priority system
- Rule testing and application
- Usage tracking and statistics

### ✅ Database Backup
- Manual and automatic backups
- Backup settings management
- Backup restoration
- File size tracking

## API Endpoints

All existing API endpoints have been preserved:

- `POST /api/upload/` - Single file upload
- `POST /api/upload/multiple` - Multiple file upload
- `GET /api/accounts/` - Get all accounts
- `POST /api/accounts/create/` - Create account
- `PUT /api/accounts/:id/` - Update account
- `DELETE /api/accounts/:id/delete/` - Delete account
- `GET /api/categories/` - Get categories
- `POST /api/categories/create/` - Create category
- `GET /api/transactions/` - Get transactions
- `PUT /api/transactions/:id/update-category/` - Update transaction category
- `GET /api/visualizations/` - Get visualization data
- `GET /api/dashboard/` - Get dashboard data
- `GET /api/rules/` - Get categorization rules
- `POST /api/rules/create/` - Create rule
- `GET /api/backup/` - Get backups
- `POST /api/backup/create/` - Create backup

## Running the Application

### Development Mode
```bash
# Start with Node.js backend
npm run start-nodejs

# Or start individual components
npm run backend-nodejs  # Start Node.js backend
npm run frontend        # Start React frontend
npm run electron        # Start Electron app
```

### Production Mode
```bash
# Build and package
npm run build-frontend
npm run dist
```

## Database Migration

The SQLite database structure remains the same. The Node.js backend will automatically:
1. Detect existing database
2. Sync models with current schema
3. Preserve all existing data

## Benefits of Migration

### Performance Improvements
- **Faster startup**: No Python runtime overhead
- **Better memory usage**: Single Node.js process
- **Improved file processing**: Native JavaScript libraries

### Simplified Deployment
- **Smaller bundle size**: No Python dependencies
- **Easier packaging**: Single runtime environment
- **Better cross-platform support**: Node.js is more portable

### Development Experience
- **Unified language**: JavaScript throughout the stack
- **Better debugging**: Single runtime environment
- **Faster development**: No context switching between languages

## Migration Checklist

- [x] Analyze Django models and API endpoints
- [x] Set up Node.js backend with Express.js
- [x] Convert Django models to Sequelize models
- [x] Implement all API endpoints
- [x] Port file upload functionality
- [x] Migrate auto-categorization logic
- [x] Update Electron integration
- [x] Test all functionality
- [ ] Performance testing
- [ ] User acceptance testing

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8000 and 3000 are available
2. **Database issues**: Check SQLite file permissions
3. **File upload errors**: Verify upload directory exists and is writable
4. **Memory issues**: Monitor Node.js process memory usage

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run backend-nodejs
```

## Future Enhancements

- Real-time updates with WebSockets
- Advanced caching with Redis
- Microservices architecture
- GraphQL API
- Advanced analytics with machine learning

## Support

For issues or questions about the migration:
1. Check the console logs for error messages
2. Verify all dependencies are installed
3. Ensure database file is accessible
4. Test API endpoints individually

The migration maintains full backward compatibility while providing significant performance and deployment improvements.
