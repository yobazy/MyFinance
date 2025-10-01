#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MyFinance Dashboard (With Build)...\n');

// First, build the frontend
console.log('🏗️  Building React frontend...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Frontend build completed successfully\n');
    
    // Start Django backend
    console.log('📡 Starting Django backend...');
    const backend = spawn('python', ['manage.py', 'runserver', '8000', '--noreload'], {
      cwd: path.join(__dirname),
      stdio: 'inherit',
      shell: true
    });

    // Wait a bit for backend to start, then start Electron
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
        process.exit(0);
      });
    }, 5000); // Wait 5 seconds for backend to start

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development servers...');
      backend.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down development servers...');
      backend.kill();
      process.exit(0);
    });
    
  } else {
    console.error('❌ Frontend build failed');
    process.exit(1);
  }
});
