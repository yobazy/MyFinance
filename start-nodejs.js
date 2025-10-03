#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MyFinance Dashboard with Node.js Backend...\n');

async function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(startPort + 1));
  });
}

async function startNodejsApp() {
  try {
    // Find available ports
    const backendPort = await findAvailablePort(8000);
    const frontendPort = await findAvailablePort(3000);

    console.log(`📡 Backend will use port: ${backendPort}`);
    console.log(`⚛️  Frontend will use port: ${frontendPort}\n`);

    // Start Node.js backend
    console.log('📡 Starting Node.js backend...');
    const backend = spawn('node', ['backend-nodejs/server.js'], {
      cwd: path.join(__dirname),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: backendPort.toString() }
    });

    // Start React frontend
    console.log('⚛️  Starting React frontend...');
    const frontend = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: frontendPort.toString() }
    });

    // Wait a bit for servers to start, then start Electron
    setTimeout(() => {
      console.log('🖥️  Starting Electron...');
      
      const electron = spawn('npx', ['electron', 'electron/main-nodejs.js'], {
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
    }, 8000); // Wait 8 seconds for servers to start

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

  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

startNodejsApp();
