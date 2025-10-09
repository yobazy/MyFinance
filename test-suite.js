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
      // Parse Jest output to extract test statistics
      const stats = parseJestOutput(output, errorOutput);
      
      if (code === 0) {
        console.log(`✅ ${test.name} passed - ${stats.passed}/${stats.total} tests`);
        resolve({ 
          name: test.name, 
          passed: true, 
          output, 
          errorOutput,
          stats 
        });
      } else {
        console.log(`❌ ${test.name} failed - ${stats.passed}/${stats.total} tests`);
        resolve({ 
          name: test.name, 
          passed: false, 
          output, 
          errorOutput,
          stats 
        });
      }
    });
  });
}

function parseJestOutput(output, errorOutput) {
  const combinedOutput = output + errorOutput;
  
  // Look for Jest test summary patterns (both formats)
  const testSummaryMatch = combinedOutput.match(/Tests:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/);
  const testSuitesMatch = combinedOutput.match(/Test Suites:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/);
  
  if (testSummaryMatch) {
    const failed = parseInt(testSummaryMatch[1]);
    const passed = parseInt(testSummaryMatch[2]);
    const total = parseInt(testSummaryMatch[3]);
    
    return {
      passed,
      failed,
      total,
      suites: testSuitesMatch ? {
        failed: parseInt(testSuitesMatch[1]),
        passed: parseInt(testSuitesMatch[2]),
        total: parseInt(testSuitesMatch[3])
      } : null
    };
  }
  
  // Look for React Scripts test format (no failed tests mentioned when all pass)
  const reactScriptsMatch = combinedOutput.match(/Tests:\s*(\d+)\s*passed,\s*(\d+)\s*total/);
  if (reactScriptsMatch) {
    const passed = parseInt(reactScriptsMatch[1]);
    const total = parseInt(reactScriptsMatch[2]);
    const failed = total - passed;
    
    return {
      passed,
      failed,
      total,
      suites: testSuitesMatch ? {
        failed: parseInt(testSuitesMatch[1]),
        passed: parseInt(testSuitesMatch[2]),
        total: parseInt(testSuitesMatch[3])
      } : null
    };
  }
  
  // Fallback: look for individual test results
  const passedTests = (combinedOutput.match(/✓/g) || []).length;
  const failedTests = (combinedOutput.match(/✕/g) || []).length;
  const totalTests = passedTests + failedTests;
  
  return {
    passed: passedTests,
    failed: failedTests,
    total: totalTests,
    suites: null
  };
}

async function runAllTests() {
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  console.log('📋 Running Test Suites...\n');
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    // Accumulate statistics
    if (result.stats) {
      totalPassed += result.stats.passed || 0;
      totalFailed += result.stats.failed || 0;
      totalTests += result.stats.total || 0;
    }
    
    console.log(''); // Empty line for readability
  }

  // Quick Summary at the top
  const passedSuites = results.filter(r => r.passed).length;
  const totalSuites = results.length;
  
  console.log('📋 QUICK SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total Tests: ${totalTests} | ✅ Passed: ${totalPassed} | ❌ Failed: ${totalFailed}`);
  console.log(`Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}% | Test Suites: ${passedSuites}/${totalSuites} passed`);
  console.log('');

  // Detailed Summary
  console.log('📊 DETAILED TEST RESULTS');
  console.log('═'.repeat(50));
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const stats = result.stats;
    
    if (stats && stats.total > 0) {
      console.log(`${status} ${result.name}`);
      console.log(`   Tests: ${stats.passed}/${stats.total} passed (${stats.failed} failed)`);
      if (stats.suites) {
        console.log(`   Suites: ${stats.suites.passed}/${stats.suites.total} passed (${stats.suites.failed} failed)`);
      }
    } else {
      console.log(`${status} ${result.name} - No test statistics available`);
    }
    console.log('');
  });

  // Overall Statistics
  console.log('📈 OVERALL STATISTICS');
  console.log('═'.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`);
  console.log(`📦 Test Suites: ${passedSuites}/${totalSuites} passed`);
  console.log('');

  // Show detailed failures if any
  const failedResults = results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    console.log('🚨 FAILED TEST DETAILS');
    console.log('═'.repeat(50));
    
    failedResults.forEach(result => {
      console.log(`❌ ${result.name}`);
      console.log(`   Tests: ${result.stats?.passed || 0}/${result.stats?.total || 0} passed`);
      
      // Extract specific failure information
      const failureInfo = extractFailureInfo(result.output, result.errorOutput);
      if (failureInfo.length > 0) {
        console.log('   Key Failures:');
        failureInfo.slice(0, 3).forEach(failure => {
          console.log(`   • ${failure}`);
        });
        if (failureInfo.length > 3) {
          console.log(`   • ... and ${failureInfo.length - 3} more failures`);
        }
      }
      console.log('');
    });
  }

  // Final Status
  if (totalFailed === 0) {
    console.log('🎉 All tests passed! MyFinance Dashboard is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the details above.');
    console.log(`\nFailed test suites: ${failedResults.map(r => r.name).join(', ')}`);
    process.exit(1);
  }
}

function extractFailureInfo(output, errorOutput) {
  const combinedOutput = output + errorOutput;
  const failures = [];
  
  // Look for specific test failure patterns
  const failureMatches = combinedOutput.match(/●\s+([^\n]+)/g);
  if (failureMatches) {
    failureMatches.forEach(match => {
      const cleanFailure = match.replace(/●\s+/, '').trim();
      if (cleanFailure && !cleanFailure.includes('should')) {
        failures.push(cleanFailure);
      }
    });
  }
  
  // Look for error messages
  const errorMatches = combinedOutput.match(/Error:\s*([^\n]+)/g);
  if (errorMatches) {
    errorMatches.forEach(match => {
      const cleanError = match.replace(/Error:\s*/, '').trim();
      if (cleanError && !failures.includes(cleanError)) {
        failures.push(cleanError);
      }
    });
  }
  
  // Look for specific database errors
  const dbErrorMatches = combinedOutput.match(/SQLiteQueryInterface\.bulkDelete/g);
  if (dbErrorMatches && dbErrorMatches.length > 0) {
    failures.push(`Database table issue: ${dbErrorMatches.length} SQLiteQueryInterface.bulkDelete errors`);
  }
  
  // Look for missing module errors
  const moduleErrorMatches = combinedOutput.match(/Cannot find module\s+([^\n]+)/g);
  if (moduleErrorMatches && moduleErrorMatches.length > 0) {
    moduleErrorMatches.forEach(match => {
      const modulePath = match.replace(/Cannot find module\s+/, '').trim();
      failures.push(`Missing module: ${modulePath}`);
    });
  }
  
  // Look for backup-specific errors
  const backupErrorMatches = combinedOutput.match(/DatabaseBackup\.destroy/g);
  if (backupErrorMatches && backupErrorMatches.length > 0) {
    failures.push(`Backup system: ${backupErrorMatches.length} DatabaseBackup.destroy failures`);
  }
  
  return failures;
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
