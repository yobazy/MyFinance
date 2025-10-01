#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MyFinance Dashboard in development mode...\n');

// Start Django backend
console.log('📡 Starting Django backend...');
const backend = spawn('python', ['manage.py', 'runserver'], {
  cwd: path.join(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true
});

// Start React frontend
console.log('⚛️  Starting React frontend...');
const frontend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, '../frontend'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001' }
});

// Start Electron
setTimeout(() => {
  console.log('🖥️  Starting Electron...');
  const electron = spawn('npx', ['electron', '.'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  electron.on('close', () => {
    console.log('🛑 Electron closed, shutting down other processes...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}, 5000); // Wait 5 seconds for servers to start

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
