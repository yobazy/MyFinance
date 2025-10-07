const { spawn, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

class ProcessManager {
  constructor() {
    this.backendProcess = null;
    this.backendPort = null;
    this.pidFile = path.join(__dirname, '../backend.pid');
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        const actualPort = server.address().port;
        server.close(() => {
          resolve(actualPort === port);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Find an available port starting from a given port
   */
  async findAvailablePort(startPort = 8000, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found starting from ${startPort}`);
  }

  /**
   * Check if backend process is running by PID
   */
  async isBackendRunning() {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim());
        
        // Check if process is actually running
        return new Promise((resolve) => {
          exec(`ps -p ${pid}`, (error) => {
            resolve(!error); // If no error, process exists
          });
        });
      }
      return false;
    } catch (error) {
      console.warn('Error checking backend PID:', error.message);
      return false;
    }
  }

  /**
   * Kill existing backend process
   */
  async killExistingBackend() {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim());
        console.log(`🔄 Attempting to kill existing backend process (PID: ${pid})`);
        
        return new Promise((resolve) => {
          exec(`kill -TERM ${pid}`, (error) => {
            if (error) {
              console.log('Process may have already exited or does not exist');
            } else {
              console.log('✅ Existing backend process terminated');
            }
            
            // Clean up PID file
            try {
              fs.unlinkSync(this.pidFile);
            } catch (unlinkError) {
              // Ignore unlink errors
            }
            resolve();
          });
        });
      }
    } catch (error) {
      console.warn('Error killing existing backend:', error.message);
    }
  }

  /**
   * Check backend health by making HTTP request
   */
  async checkBackendHealth(port, timeout = 5000) {
    return new Promise((resolve) => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: timeout
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            resolve(health.status === 'OK');
          } catch (error) {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Wait for backend to be ready with retries
   */
  async waitForBackendReady(port, maxRetries = 10, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      console.log(`🔄 Checking backend health (attempt ${i + 1}/${maxRetries})...`);
      
      if (await this.checkBackendHealth(port)) {
        console.log('✅ Backend is healthy and ready');
        return true;
      }
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error('❌ Backend failed to become ready within timeout');
    return false;
  }

  /**
   * Start backend process with proper management
   */
  async startBackend(projectRoot, isPackaged = false) {
    try {
      console.log('🚀 Starting backend process...');
      
      // Kill any existing backend first
      await this.killExistingBackend();
      
      // Find available port
      this.backendPort = await this.findAvailablePort();
      console.log(`📡 Using port: ${this.backendPort}`);
      
      // Determine backend path and arguments
      let backendPath, args;
      
      if (isPackaged) {
        // Production: Use system Node.js
        const nodePaths = [
          'node',
          'nodejs',
          '/usr/bin/node',
          '/usr/local/bin/node',
          '/opt/homebrew/bin/node'
        ];
        
        let nodeExecutable = null;
        for (const nodePath of nodePaths) {
          try {
            const result = require('child_process').execSync(`${nodePath} --version`, { timeout: 5000 });
            if (result) {
              nodeExecutable = nodePath;
              break;
            }
          } catch (error) {
            // Continue to next path
          }
        }
        
        if (!nodeExecutable) {
          throw new Error('Node.js executable not found');
        }
        
        backendPath = nodeExecutable;
        args = [path.join(process.resourcesPath, 'backend-nodejs/server.js')];
      } else {
        // Development: Use system Node.js
        backendPath = 'node';
        args = [path.join(projectRoot, 'backend-nodejs/server.js')];
      }
      
      // Start backend process
      this.backendProcess = spawn(backendPath, args, {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          PORT: this.backendPort.toString(),
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });
      
      // Save PID for future reference
      fs.writeFileSync(this.pidFile, this.backendProcess.pid.toString());
      console.log(`📝 Backend PID saved: ${this.backendProcess.pid}`);
      
      // Set up process event handlers
      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Backend:', output);
      });
      
      this.backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Backend Error:', error);
        
        // Check for port conflicts
        if (error.includes('EADDRINUSE')) {
          console.error('❌ Port conflict detected');
        }
      });
      
      this.backendProcess.on('error', (error) => {
        console.error('❌ Backend process error:', error);
      });
      
      this.backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
        this.cleanup();
      });
      
      // Wait for backend to be ready
      const isReady = await this.waitForBackendReady(this.backendPort);
      if (!isReady) {
        throw new Error('Backend failed to start properly');
      }
      
      return {
        process: this.backendProcess,
        port: this.backendPort,
        pid: this.backendProcess.pid
      };
      
    } catch (error) {
      console.error('❌ Failed to start backend:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop backend process gracefully
   */
  async stopBackend() {
    if (this.backendProcess) {
      console.log('🛑 Stopping backend process...');
      
      // Try graceful shutdown first
      this.backendProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⚠️  Graceful shutdown timeout, forcing kill...');
          this.backendProcess.kill('SIGKILL');
          resolve();
        }, 5000);
        
        this.backendProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.backendProcess = null;
    this.backendPort = null;
    
    // Remove PID file
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch (error) {
      console.warn('Error removing PID file:', error.message);
    }
  }

  /**
   * Get backend status
   */
  getStatus() {
    return {
      isRunning: this.backendProcess !== null,
      port: this.backendPort,
      pid: this.backendProcess ? this.backendProcess.pid : null
    };
  }
}

module.exports = ProcessManager;
