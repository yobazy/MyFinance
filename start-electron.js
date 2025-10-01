#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(true);
    });
  });
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 10) {
    if (!(await isPortInUse(port))) {
      return port;
    }
    port++;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startElectronApp() {
  console.log('🚀 Starting MyFinance Dashboard...\n');

  try {
    // Find available ports
    const backendPort = await findAvailablePort(8000);
    const frontendPort = await findAvailablePort(3000);

    console.log(`📡 Backend will use port: ${backendPort}`);
    console.log(`⚛️  Frontend will use port: ${frontendPort}\n`);

    // Start Django backend
    console.log('📡 Starting Django backend...');
    const backend = spawn('python', ['manage.py', 'runserver', backendPort.toString(), '--noreload'], {
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
      env: { ...process.env, PORT: frontendPort.toString() }
    });

    // Wait a bit for servers to start, then start Electron
    setTimeout(async () => {
      console.log('🖥️  Starting Electron...');
      
      // Update the main.js to use the correct frontend port
      const mainJsPath = path.join(__dirname, 'electron/main.js');
      const fs = require('fs');
      
      let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
      mainJsContent = mainJsContent.replace(
        /mainWindow\.loadURL\('http:\/\/localhost:\d+'\)/,
        `mainWindow.loadURL('http://localhost:${frontendPort}')`
      );
      fs.writeFileSync(mainJsPath, mainJsContent);

      const electron = spawn('npx', ['electron', '.'], {
        cwd: path.join(__dirname),
        stdio: 'inherit',
        shell: true
      });

      electron.on('close', () => {
        console.log('🛑 Electron closed, shutting down other processes...');
        backend.kill();
        frontend.kill();
        
        // Restore original main.js
        mainJsContent = mainJsContent.replace(
          `mainWindow.loadURL('http://localhost:${frontendPort}')`,
          "mainWindow.loadURL('http://localhost:3001')"
        );
        fs.writeFileSync(mainJsPath, mainJsContent);
        
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
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

startElectronApp();
