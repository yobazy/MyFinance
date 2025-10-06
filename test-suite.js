#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running MyFinance Dashboard Test Suite...\n');

// Test configuration
const tests = [
  {
    name: 'Backend Integration Tests',
    command: 'node',
    args: ['test-nodejs-backend.js'],
    cwd: process.cwd()
  },
  {
    name: 'Backend Unit Tests',
    command: 'npm',
    args: ['test'],
    cwd: path.join(process.cwd(), 'backend-nodejs')
  },
  {
    name: 'Frontend Tests',
    command: 'npm',
    args: ['test', '--', '--watchAll=false'],
    cwd: path.join(process.cwd(), 'frontend')
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`🔍 Running ${test.name}...`);
    
    const child = spawn(test.command, test.args, {
      cwd: test.cwd,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.name} passed`);
        resolve({ name: test.name, passed: true, output, errorOutput });
      } else {
        console.log(`❌ ${test.name} failed`);
        resolve({ name: test.name, passed: false, output, errorOutput });
      }
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    console.log(''); // Empty line for readability
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('📊 Test Suite Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All test suites passed! MyFinance Dashboard is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some test suites failed. Please check the output above.');
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`- ${result.name}`);
    });
    process.exit(1);
  }
}

// Check if backend is running first
async function checkBackendRunning() {
  const http = require('http');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET'
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Checking if backend is running...');
  
  const isBackendRunning = await checkBackendRunning();
  if (!isBackendRunning) {
    console.log('❌ Backend server is not running on port 8000');
    console.log('Please start the backend first:');
    console.log('  cd backend-nodejs && npm start');
    console.log('  or');
    console.log('  npm run backend-nodejs');
    process.exit(1);
  }

  console.log('✅ Backend server is running\n');
  await runAllTests();
}

main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
