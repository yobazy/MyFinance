#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running MyFinance Dashboard Test Suite...\n');

// Server management
let backendProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_STARTUP_TIMEOUT = 30000; // 30 seconds

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
    name: 'Multi-Bank Workflow Tests',
    command: 'npm',
    args: ['test', 'tests/multi-bank-workflow.test.js'],
    cwd: path.join(process.cwd(), 'backend-nodejs')
  },
  {
    name: 'Multiple Accounts Tests',
    command: 'npm',
    args: ['test', 'tests/multiple-accounts-per-bank.test.js'],
    cwd: path.join(process.cwd(), 'backend-nodejs')
  },
  {
    name: 'Account Display Tests',
    command: 'npm',
    args: ['test', 'tests/account-display.test.js'],
    cwd: path.join(process.cwd(), 'backend-nodejs')
  },
  {
    name: 'Frontend Tests',
    command: 'npm',
    args: ['test', '--', '--watchAll=false'],
    cwd: path.join(process.cwd(), 'frontend')
  }
];

// Server management functions
async function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server...');
    
    backendProcess = spawn('npm', ['start'], {
      cwd: path.join(process.cwd(), 'backend-nodejs'),
      stdio: 'pipe'
    });

    let startupOutput = '';
    let startupError = '';

    backendProcess.stdout.on('data', (data) => {
      startupOutput += data.toString();
      // Check if server is ready
      if (startupOutput.includes('Server running on port') || startupOutput.includes('listening')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      startupError += data.toString();
    });

    backendProcess.on('error', (error) => {
      reject(new Error(`Failed to start backend: ${error.message}`));
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Backend exited with code ${code}: ${startupError}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        reject(new Error('Backend startup timeout'));
      }
    }, BACKEND_STARTUP_TIMEOUT);
  });
}

async function stopBackendServer() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      resolve();
      return;
    }

    console.log('🛑 Stopping backend server...');
    
    backendProcess.on('exit', () => {
      console.log('✅ Backend server stopped');
      resolve();
    });

    backendProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
        resolve();
      }
    }, 5000);
  });
}

async function checkBackendRunning() {
  const http = require('http');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: BACKEND_PORT,
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


async function main() {
  try {
    // Check if backend is already running
    const isBackendRunning = await checkBackendRunning();
    
    if (!isBackendRunning) {
      // Start the backend server
      await startBackendServer();
      
      // Wait a moment for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify server is running
      const isNowRunning = await checkBackendRunning();
      if (!isNowRunning) {
        throw new Error('Backend server failed to start properly');
      }
      
      console.log('✅ Backend server started and ready\n');
    } else {
      console.log('✅ Backend server is already running\n');
    }

    // Run all tests
    await runAllTests();
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  } finally {
    // Always stop the server if we started it
    await stopBackendServer();
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, stopping server...');
  await stopBackendServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, stopping server...');
  await stopBackendServer();
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
