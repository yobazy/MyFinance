#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Node.js Backend Migration...\n');

// Test configuration
const BACKEND_URL = 'http://localhost:8000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await makeRequest('/health');
    if (response.status === 200) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAccountsAPI() {
  console.log('🔍 Testing accounts API...');
  try {
    const response = await makeRequest('/api/accounts/');
    if (response.status === 200) {
      console.log('✅ Accounts API working');
      return true;
    } else {
      console.log('❌ Accounts API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Accounts API failed:', error.message);
    return false;
  }
}

async function testCategoriesAPI() {
  console.log('🔍 Testing categories API...');
  try {
    const response = await makeRequest('/api/categories/');
    if (response.status === 200) {
      console.log('✅ Categories API working');
      return true;
    } else {
      console.log('❌ Categories API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Categories API failed:', error.message);
    return false;
  }
}

async function testTransactionsAPI() {
  console.log('🔍 Testing transactions API...');
  try {
    const response = await makeRequest('/api/transactions/');
    if (response.status === 200) {
      console.log('✅ Transactions API working');
      return true;
    } else {
      console.log('❌ Transactions API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Transactions API failed:', error.message);
    return false;
  }
}

async function testDashboardAPI() {
  console.log('🔍 Testing dashboard API...');
  try {
    const response = await makeRequest('/api/dashboard/');
    if (response.status === 200) {
      console.log('✅ Dashboard API working');
      return true;
    } else {
      console.log('❌ Dashboard API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Dashboard API failed:', error.message);
    return false;
  }
}

async function testVisualizationsAPI() {
  console.log('🔍 Testing visualizations API...');
  try {
    const response = await makeRequest('/api/visualizations/');
    if (response.status === 200) {
      console.log('✅ Visualizations API working');
      return true;
    } else {
      console.log('❌ Visualizations API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Visualizations API failed:', error.message);
    return false;
  }
}

async function testRulesAPI() {
  console.log('🔍 Testing rules API...');
  try {
    const response = await makeRequest('/api/rules/');
    if (response.status === 200) {
      console.log('✅ Rules API working');
      return true;
    } else {
      console.log('❌ Rules API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Rules API failed:', error.message);
    return false;
  }
}

async function testBackupAPI() {
  console.log('🔍 Testing backup API...');
  try {
    const response = await makeRequest('/api/backup/settings');
    if (response.status === 200) {
      console.log('✅ Backup API working');
      return true;
    } else {
      console.log('❌ Backup API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backup API failed:', error.message);
    return false;
  }
}

async function testAccountsCreation() {
  console.log('🔍 Testing accounts creation for each bank...');
  try {
    const banks = ['TD', 'Amex', 'Scotiabank'];
    let allPassed = true;
    const timestamp = Date.now();

    for (const bank of banks) {
      const accountData = {
        bank: bank,
        name: `Test ${bank} Account ${timestamp}`,
        type: 'checking'
      };

      const response = await makeRequest('/api/accounts/create', 'POST', accountData);
      if (response.status === 201) {
        console.log(`✅ ${bank} account creation working`);
      } else {
        console.log(`❌ ${bank} account creation failed:`, response.status, response.body);
        allPassed = false;
      }
    }

    return allPassed;
  } catch (error) {
    console.log('❌ Accounts creation test failed:', error.message);
    return false;
  }
}

async function testAccountsDuplicatePrevention() {
  console.log('🔍 Testing duplicate account name prevention...');
  try {
    const timestamp = Date.now();
    const accountData = {
      bank: 'TD',
      name: `Duplicate Test Account ${timestamp}`,
      type: 'checking'
    };

    // Create first account
    const firstResponse = await makeRequest('/api/accounts/create', 'POST', accountData);
    if (firstResponse.status !== 201) {
      console.log('❌ First account creation failed:', firstResponse.status, firstResponse.body);
      return false;
    }
    console.log('✅ First account created successfully');

    // Try to create duplicate account
    const duplicateResponse = await makeRequest('/api/accounts/create', 'POST', accountData);
    if (duplicateResponse.status === 400 && duplicateResponse.body.error.includes('already exists')) {
      console.log('✅ Duplicate account prevention working');
      return true;
    } else {
      console.log('❌ Duplicate account prevention failed:', duplicateResponse.status, duplicateResponse.body);
      return false;
    }
  } catch (error) {
    console.log('❌ Duplicate prevention test failed:', error.message);
    return false;
  }
}

async function testAccountsValidation() {
  console.log('🔍 Testing account validation...');
  try {
    // Test missing bank parameter
    const missingBankResponse = await makeRequest('/api/accounts/create', 'POST', {
      name: 'Test Account',
      type: 'checking'
    });
    
    if (missingBankResponse.status === 400 && missingBankResponse.body.error.includes('Bank and account name are required')) {
      console.log('✅ Missing bank validation working');
    } else {
      console.log('❌ Missing bank validation failed:', missingBankResponse.status, missingBankResponse.body);
      return false;
    }

    // Test missing name parameter
    const missingNameResponse = await makeRequest('/api/accounts/create', 'POST', {
      bank: 'TD',
      type: 'checking'
    });
    
    if (missingNameResponse.status === 400 && missingNameResponse.body.error.includes('Bank and account name are required')) {
      console.log('✅ Missing name validation working');
    } else {
      console.log('❌ Missing name validation failed:', missingNameResponse.status, missingNameResponse.body);
      return false;
    }

    return true;
  } catch (error) {
    console.log('❌ Account validation test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting backend tests...\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Accounts API', fn: testAccountsAPI },
    { name: 'Accounts Creation (All Banks)', fn: testAccountsCreation },
    { name: 'Accounts Duplicate Prevention', fn: testAccountsDuplicatePrevention },
    { name: 'Accounts Validation', fn: testAccountsValidation },
    { name: 'Categories API', fn: testCategoriesAPI },
    { name: 'Transactions API', fn: testTransactionsAPI },
    { name: 'Dashboard API', fn: testDashboardAPI },
    { name: 'Visualizations API', fn: testVisualizationsAPI },
    { name: 'Rules API', fn: testRulesAPI },
    { name: 'Backup API', fn: testBackupAPI }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log(''); // Empty line for readability
  }

  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Node.js backend is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the backend server.');
    process.exit(1);
  }
}

// Check if backend is running
async function checkBackendRunning() {
  try {
    await makeRequest('/health');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if backend is running...');
  
  const isRunning = await checkBackendRunning();
  if (!isRunning) {
    console.log('❌ Backend server is not running on port 8000');
    console.log('Please start the backend first:');
    console.log('  cd backend-nodejs && npm start');
    console.log('  or');
    console.log('  npm run backend-nodejs');
    process.exit(1);
  }

  console.log('✅ Backend server is running\n');
  await runTests();
}

main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
