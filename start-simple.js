#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MyFinance Dashboard (Simple Mode)...\n');

// Start Django backend
console.log('📡 Starting Django backend...');
const backend = spawn('python', ['manage.py', 'runserver', '8000', '--noreload'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

// Start React frontend
console.log('⚛️  Starting React frontend...');
const frontend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001' }
});

// Wait a bit for servers to start, then start Electron
setTimeout(() => {
  console.log('🖥️  Starting Electron...');
  
  const electron = spawn('npx', ['electron', '.'], {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    shell: true
  });

  electron.on('close', () => {
    console.log('🛑 Electron closed, shutting down other processes...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}, 10000); // Wait 10 seconds for servers to start

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
