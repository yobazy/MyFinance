#!/usr/bin/env node

// Debug script to test ProcessManager loading in production
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing ProcessManager loading...');
console.log('📁 Current directory:', process.cwd());
console.log('📁 __dirname:', __dirname);
console.log('📁 process.resourcesPath:', process.resourcesPath);

// Test development path
try {
  console.log('🔄 Trying development path...');
  const devPath = path.join(__dirname, 'backend-nodejs/utils/processManager');
  console.log('📁 Development path:', devPath);
  console.log('📁 Development path exists:', fs.existsSync(devPath + '.js'));
  
  if (fs.existsSync(devPath + '.js')) {
    const ProcessManager = require(devPath);
    console.log('✅ Development ProcessManager loaded successfully');
  }
} catch (error) {
  console.log('❌ Development path failed:', error.message);
}

// Test production path
try {
  console.log('🔄 Trying production path...');
  const prodPath = path.join(process.resourcesPath, 'backend-nodejs/utils/processManager');
  console.log('📁 Production path:', prodPath);
  console.log('📁 Production path exists:', fs.existsSync(prodPath + '.js'));
  
  if (fs.existsSync(prodPath + '.js')) {
    const ProcessManager = require(prodPath);
    console.log('✅ Production ProcessManager loaded successfully');
  }
} catch (error) {
  console.log('❌ Production path failed:', error.message);
}

// List files in resources directory
console.log('📁 Files in process.resourcesPath:');
try {
  const files = fs.readdirSync(process.resourcesPath);
  files.forEach(file => {
    const filePath = path.join(process.resourcesPath, file);
    const stat = fs.statSync(filePath);
    console.log(`  ${stat.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (error) {
  console.log('❌ Error reading resources directory:', error.message);
}
