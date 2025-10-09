#!/usr/bin/env node

// Test script to run from within the app bundle
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing from within app bundle...');
console.log('📁 process.resourcesPath:', process.resourcesPath);
console.log('📁 __dirname:', __dirname);

// Check if ProcessManager exists
const processManagerPath = path.join(process.resourcesPath, 'backend-nodejs/utils/processManager.js');
console.log('📁 ProcessManager path:', processManagerPath);
console.log('📁 ProcessManager exists:', fs.existsSync(processManagerPath));

if (fs.existsSync(processManagerPath)) {
  try {
    const ProcessManager = require(processManagerPath);
    console.log('✅ ProcessManager loaded successfully');
    
    // Test ProcessManager
    const pm = new ProcessManager();
    console.log('✅ ProcessManager instance created');
  } catch (error) {
    console.error('❌ Error loading ProcessManager:', error.message);
  }
} else {
  console.log('❌ ProcessManager not found');
}

// Check if backend server exists
const serverPath = path.join(process.resourcesPath, 'backend-nodejs/server.js');
console.log('📁 Server path:', serverPath);
console.log('📁 Server exists:', fs.existsSync(serverPath));
