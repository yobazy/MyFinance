# MyFinance Dashboard - Test Coverage Outline (Legacy)

## Overview
This document was written for the **legacy Django + CRA** stack (`backend/` + `frontend/`).  
If you’re migrating to **Supabase + Next.js** (`web/` + `worker/`), treat this as historical reference and rewrite tests around the new architecture.

## Backend Testing (Django)

### 1. Model Tests (`backend/tests/test_models.py`)

#### Category Model Tests
- [ ] **Basic CRUD operations**
  - Create category with required fields
  - Create category with optional fields (description, color, parent)
  - Update category fields
  - Delete category (cascade behavior)
  - Soft delete (is_active field)

- [ ] **Hierarchical relationships**
  - Create parent-child relationships
  - Test `full_path` property for nested categories
  - Test `level` property calculation
  - Test `is_root` property
  - Test `get_all_subcategories()` recursive method
  - Test unique constraint on name+parent combination

- [ ] **Business logic methods**
  - Test `get_transaction_count()` method
  - Test category tree ordering
  - Test string representation (`__str__`)

#### Account Model Tests
- [ ] **Basic CRUD operations**
  - Create account with all fields
  - Update account information
  - Delete account (cascade to transactions)
  - Test unique constraint on bank+name

- [ ] **Balance calculation methods**
  - Test `calculate_balance()` with transactions
  - Test `calculate_balance()` with no transactions
  - Test `update_balance()` method
  - Test balance calculation with positive/negative amounts

#### Transaction Model Tests
- [ ] **Basic CRUD operations**
  - Create transaction with required fields
  - Create transaction with optional category
  - Update transaction fields
  - Delete transaction

- [ ] **Auto-categorization fields**
  - Test `auto_categorized` field behavior
  - Test `confidence_score` field validation
  - Test `suggested_category` field

#### CategorizationRule Model Tests
- [ ] **Rule creation and validation**
  - Test all rule types (keyword, contains, exact, regex, amount_range, etc.)
  - Test pattern validation for different rule types
  - Test priority ordering
  - Test case sensitivity options

- [ ] **Rule matching logic**
  - Test rule matching against transactions
  - Test confidence score calculation
  - Test match counting and last_matched tracking
  - Test combined conditions for complex rules

#### Backup Models Tests
- [ ] **BackupSettings model**
  - Test default values creation
  - Test settings validation
  - Test backup frequency validation

- [ ] **DatabaseBackup model**
  - Test backup record creation
  - Test file size calculation
  - Test backup type validation
  - Test compression flag handling

### 2. API View Tests (`backend/tests/test_views.py`)

#### Account API Tests
- [ ] **GET /api/accounts/**
  - Test listing all accounts
  - Test account serialization
  - Test empty account list

- [ ] **POST /api/accounts/create/**
  - Test account creation with valid data
  - Test account creation with invalid data
  - Test duplicate account prevention
  - Test required field validation

- [ ] **PUT /api/accounts/{id}/**
  - Test account update with valid data
  - Test account update with invalid data
  - Test non-existent account handling

- [ ] **DELETE /api/accounts/{id}/delete/**
  - Test account deletion
  - Test cascade deletion of transactions
  - Test non-existent account deletion

- [ ] **POST /api/accounts/refresh-balances/**
  - Test balance refresh for all accounts
  - Test individual account balance calculation

#### Category API Tests
- [ ] **GET /api/categories/**
  - Test category listing
  - Test category tree structure
  - Test subcategory relationships

- [ ] **POST /api/categories/create/**
  - Test root category creation
  - Test subcategory creation
  - Test category validation

- [ ] **PUT /api/categories/{id}/**
  - Test category updates
  - Test parent relationship updates
  - Test validation on updates

- [ ] **DELETE /api/categories/{id}/delete/**
  - Test category deletion
  - Test cascade behavior with subcategories
  - Test transaction category handling

#### Transaction API Tests
- [ ] **GET /api/transactions/**
  - Test transaction listing with pagination
  - Test filtering by account, category, date range
  - Test sorting options
  - Test search functionality

- [ ] **POST /api/transactions/create/**
  - Test transaction creation
  - Test auto-categorization trigger
  - Test validation

- [ ] **PUT /api/transactions/{id}/**
  - Test transaction updates
  - Test category assignment
  - Test amount updates

- [ ] **DELETE /api/transactions/{id}/delete/**
  - Test transaction deletion
  - Test account balance recalculation

#### File Upload API Tests
- [ ] **POST /api/upload/**
  - Test TD CSV file upload
  - Test Amex XLS file upload
  - Test file validation
  - Test account association
  - Test transaction creation from files
  - Test error handling for invalid files

#### Auto-Categorization API Tests
- [ ] **POST /api/auto-categorization/auto-categorize/**
  - Test bulk auto-categorization
  - Test confidence score calculation
  - Test rule application

- [ ] **GET /api/auto-categorization/suggestions/{id}/**
  - Test suggestion generation
  - Test confidence scoring

- [ ] **POST /api/auto-categorization/preview/**
  - Test categorization preview
  - Test preview accuracy

#### Rule Management API Tests
- [ ] **GET /api/rules/**
  - Test rule listing
  - Test rule filtering and sorting

- [ ] **POST /api/rules/create/**
  - Test rule creation
  - Test rule validation
  - Test pattern validation

- [ ] **PUT /api/rules/{id}/update/**
  - Test rule updates
  - Test rule activation/deactivation

- [ ] **POST /api/rules/{id}/test/**
  - Test rule testing against transactions
  - Test rule performance

- [ ] **POST /api/rules/{id}/apply/**
  - Test rule application to transactions
  - Test batch processing

#### Backup API Tests
- [ ] **GET /api/backup/settings/**
  - Test backup settings retrieval

- [ ] **POST /api/backup/settings/**
  - Test backup settings update

- [ ] **POST /api/backup/create/**
  - Test manual backup creation
  - Test backup file generation

- [ ] **GET /api/backup/list/**
  - Test backup listing
  - Test backup metadata

- [ ] **POST /api/backup/{id}/restore/**
  - Test backup restoration
  - Test data integrity after restore

### 3. Service Tests (`backend/tests/test_services.py`)

#### AutoCategorizationService Tests
- [ ] **Rule matching logic**
  - Test keyword matching
  - Test regex pattern matching
  - Test amount range matching
  - Test combined conditions
  - Test case sensitivity

- [ ] **Confidence scoring**
  - Test confidence calculation for different rule types
  - Test confidence aggregation for multiple matches
  - Test minimum confidence thresholds

- [ ] **Default rules**
  - Test Canadian merchant recognition
  - Test category assignment accuracy
  - Test rule priority handling

- [ ] **Transaction categorization**
  - Test single transaction categorization
  - Test bulk categorization
  - Test already categorized transaction handling

#### DatabaseBackupService Tests
- [ ] **Backup creation**
  - Test SQLite backup creation
  - Test backup compression
  - Test backup file naming
  - Test backup metadata recording

- [ ] **Backup management**
  - Test backup rotation (max_backups limit)
  - Test backup cleanup
  - Test backup directory creation

- [ ] **Auto-backup functionality**
  - Test auto-backup triggering
  - Test backup frequency enforcement
  - Test backup settings validation

### 4. Serializer Tests (`backend/tests/test_serializers.py`)

#### TransactionSerializer Tests
- [ ] **Field serialization**
  - Test all field serialization
  - Test read-only fields
  - Test nested serialization (account_name, category_name)

#### CategorySerializer Tests
- [ ] **Hierarchical serialization**
  - Test subcategory serialization
  - Test parent_name field
  - Test full_path and level properties
  - Test transaction_count calculation

#### CategorizationRuleSerializer Tests
- [ ] **Rule serialization**
  - Test all rule fields
  - Test rule_preview generation
  - Test validation

### 5. Integration Tests (`backend/tests/test_integration.py`)

#### End-to-End Workflows
- [ ] **Complete transaction flow**
  - File upload → Transaction creation → Auto-categorization → Manual review
  - Test data integrity throughout the flow

- [ ] **Category management flow**
  - Category creation → Subcategory creation → Transaction assignment → Category updates

- [ ] **Rule management flow**
  - Rule creation → Rule testing → Rule application → Performance monitoring

- [ ] **Backup and restore flow**
  - Data creation → Backup creation → Data modification → Restore → Verification

## Frontend Testing (React)

### 1. Component Tests (`frontend/src/__tests__/`)

#### App Component Tests
- [ ] **Navigation**
  - Test navigation menu rendering
  - Test route navigation
  - Test mobile menu functionality
  - Test theme switching

- [ ] **Theme management**
  - Test dark/light mode switching
  - Test theme persistence
  - Test theme provider functionality

#### Dashboard Component Tests
- [ ] **Data loading**
  - Test dashboard data fetching
  - Test loading states
  - Test error handling

- [ ] **Quick actions**
  - Test quick action cards
  - Test navigation to different pages
  - Test responsive design

- [ ] **Account selection**
  - Test account dropdown
  - Test account filtering
  - Test account balance display

#### AccountsPage Component Tests
- [ ] **Account management**
  - Test account listing
  - Test account creation form
  - Test account editing
  - Test account deletion
  - Test balance refresh

- [ ] **Form validation**
  - Test required field validation
  - Test bank/name uniqueness
  - Test form submission

#### Transactions Component Tests
- [ ] **Transaction listing**
  - Test transaction table rendering
  - Test pagination
  - Test sorting functionality
  - Test filtering options

- [ ] **Transaction management**
  - Test transaction editing
  - Test category assignment
  - Test bulk operations

#### Categorization Component Tests
- [ ] **Category management**
  - Test category tree display
  - Test category creation/editing
  - Test subcategory management
  - Test category deletion

- [ ] **Auto-categorization**
  - Test auto-categorization triggers
  - Test suggestion display
  - Test confidence scores
  - Test manual overrides

#### RuleManagement Component Tests
- [ ] **Rule CRUD operations**
  - Test rule creation form
  - Test rule editing
  - Test rule deletion
  - Test rule activation/deactivation

- [ ] **Rule testing**
  - Test rule preview functionality
  - Test rule performance metrics
  - Test rule application

#### FileUploader Component Tests
- [ ] **File upload**
  - Test file selection
  - Test file validation
  - Test upload progress
  - Test error handling

- [ ] **Account selection**
  - Test account dropdown
  - Test bank selection
  - Test file type validation

#### Visualizations Component Tests
- [ ] **Chart rendering**
  - Test spending trends chart
  - Test category breakdown
  - Test monthly/yearly views
  - Test responsive charts

#### UserSettings Component Tests
- [ ] **Settings management**
  - Test backup settings
  - Test theme preferences
  - Test data export/import

### 2. API Integration Tests (`frontend/src/__tests__/api/`)

#### API Client Tests
- [ ] **HTTP client**
  - Test API base configuration
  - Test request/response interceptors
  - Test error handling
  - Test authentication (if implemented)

#### Service Tests
- [ ] **Account service**
  - Test account CRUD operations
  - Test balance refresh
  - Test error handling

- [ ] **Transaction service**
  - Test transaction CRUD operations
  - Test filtering and pagination
  - Test search functionality

- [ ] **Category service**
  - Test category CRUD operations
  - Test tree structure handling
  - Test subcategory management

- [ ] **Rule service**
  - Test rule CRUD operations
  - Test rule testing
  - Test rule application

- [ ] **Backup service**
  - Test backup creation
  - Test backup listing
  - Test backup restoration

### 3. Utility Tests (`frontend/src/__tests__/utils/`)

#### Date/Time Utilities
- [ ] **Date formatting**
  - Test date display formatting
  - Test date range calculations
  - Test timezone handling

#### Data Processing Utilities
- [ ] **Transaction processing**
  - Test data transformation
  - Test filtering logic
  - Test sorting algorithms

#### Validation Utilities
- [ ] **Form validation**
  - Test input validation
  - Test error message generation
  - Test validation rules

## End-to-End Testing

### 1. User Journey Tests (`e2e/tests/`)

#### Complete User Workflows
- [ ] **New user onboarding**
  - Account creation → File upload → Auto-categorization → Manual review

- [ ] **Regular usage**
  - Dashboard view → Transaction review → Category management → Analytics

- [ ] **Advanced features**
  - Rule creation → Rule testing → Bulk categorization → Performance monitoring

- [ ] **Data management**
  - Backup creation → Data modification → Backup restoration → Data verification

### 2. Cross-Browser Testing
- [ ] **Browser compatibility**
  - Chrome, Firefox, Safari, Edge
  - Mobile browsers
  - Responsive design testing

### 3. Performance Testing
- [ ] **Load testing**
  - Large dataset handling
  - Concurrent user simulation
  - API response times

- [ ] **Memory testing**
  - Memory leak detection
  - Large file upload handling
  - Long-running session testing

## Test Configuration

### 1. Test Environment Setup
- [ ] **Django test settings**
  - Separate test database
  - Test fixtures and factories
  - Mock external services

- [ ] **React test setup**
  - Jest configuration
  - React Testing Library setup
  - Mock API responses

### 2. Test Data Management
- [ ] **Test fixtures**
  - Sample transaction data
  - Test categories and accounts
  - Test rules and configurations

- [ ] **Test factories**
  - Model factories for consistent test data
  - API response mocks
  - File upload test data

### 3. CI/CD Integration
- [ ] **Automated testing**
  - GitHub Actions workflow
  - Test coverage reporting
  - Automated test execution

- [ ] **Quality gates**
  - Minimum coverage requirements
  - Performance benchmarks
  - Security scanning

## Test Coverage Goals

### Backend Coverage Targets
- **Models**: 95%+ coverage
- **Views**: 90%+ coverage
- **Services**: 95%+ coverage
- **Serializers**: 90%+ coverage

### Frontend Coverage Targets
- **Components**: 85%+ coverage
- **Utilities**: 95%+ coverage
- **API Integration**: 90%+ coverage

### Overall Coverage Target
- **Total Codebase**: 90%+ coverage
- **Critical Paths**: 100% coverage

## Test Maintenance

### 1. Regular Updates
- [ ] **Test data updates**
  - Keep test data current with production patterns
  - Update test scenarios for new features

- [ ] **Test optimization**
  - Remove obsolete tests
  - Optimize slow tests
  - Improve test reliability

### 2. Documentation
- [ ] **Test documentation**
  - Test case documentation
  - Test execution guides
  - Troubleshooting guides

- [ ] **Coverage reports**
  - Regular coverage analysis
  - Coverage trend tracking
  - Gap identification and remediation

