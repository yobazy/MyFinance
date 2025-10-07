#!/usr/bin/env node

/**
 * Process Management Utility
 * 
 * This script helps manage backend processes for the MyFinance application.
 * It can check for running processes, kill zombie processes, and test port availability.
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

class ProcessUtility {
  constructor() {
    this.pidFile = path.join(__dirname, '../backend.pid');
    this.backendPort = 8000;
  }

  /**
   * Check if a port is in use
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(false)); // Port is available
      });
      
      server.on('error', () => {
        resolve(true); // Port is in use
      });
    });
  }

  /**
   * Find processes using a specific port
   */
  async findProcessesOnPort(port) {
    return new Promise((resolve) => {
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error) {
          resolve([]);
        } else {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          resolve(pids);
        }
      });
    });
  }

  /**
   * Get process information by PID
   */
  async getProcessInfo(pid) {
    return new Promise((resolve) => {
      exec(`ps -p ${pid} -o pid,ppid,command`, (error, stdout) => {
        if (error) {
          resolve(null);
        } else {
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            resolve({
              pid: parts[0],
              ppid: parts[1],
              command: parts.slice(2).join(' ')
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  /**
   * Kill a process by PID
   */
  async killProcess(pid, signal = 'TERM') {
    return new Promise((resolve) => {
      exec(`kill -${signal} ${pid}`, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Check backend status
   */
  async checkBackendStatus() {
    console.log('🔍 Checking backend status...\n');
    
    // Check PID file
    let pidFromFile = null;
    if (fs.existsSync(this.pidFile)) {
      try {
        pidFromFile = fs.readFileSync(this.pidFile, 'utf8').trim();
        console.log(`📄 PID file exists: ${pidFromFile}`);
      } catch (error) {
        console.log('❌ Error reading PID file:', error.message);
      }
    } else {
      console.log('📄 No PID file found');
    }
    
    // Check if port is in use
    const portInUse = await this.isPortInUse(this.backendPort);
    console.log(`🔌 Port ${this.backendPort} is ${portInUse ? 'in use' : 'available'}`);
    
    if (portInUse) {
      const pidsOnPort = await this.findProcessesOnPort(this.backendPort);
      console.log(`🆔 Processes using port ${this.backendPort}:`, pidsOnPort);
      
      for (const pid of pidsOnPort) {
        const processInfo = await this.getProcessInfo(pid);
        if (processInfo) {
          console.log(`   PID ${pid}: ${processInfo.command}`);
        }
      }
    }
    
    // Check if PID from file is still running
    if (pidFromFile) {
      const processInfo = await this.getProcessInfo(pidFromFile);
      if (processInfo) {
        console.log(`✅ Process ${pidFromFile} is still running: ${processInfo.command}`);
      } else {
        console.log(`❌ Process ${pidFromFile} is not running (zombie PID file)`);
      }
    }
    
    return {
      pidFile: pidFromFile,
      portInUse,
      pidsOnPort: portInUse ? await this.findProcessesOnPort(this.backendPort) : []
    };
  }

  /**
   * Clean up zombie processes
   */
  async cleanupZombieProcesses() {
    console.log('🧹 Cleaning up zombie processes...\n');
    
    const status = await this.checkBackendStatus();
    
    // Remove stale PID file
    if (status.pidFile && fs.existsSync(this.pidFile)) {
      const processInfo = await this.getProcessInfo(status.pidFile);
      if (!processInfo) {
        console.log(`🗑️  Removing stale PID file (${status.pidFile})`);
        fs.unlinkSync(this.pidFile);
      }
    }
    
    // Kill processes on backend port (except if they're legitimate)
    if (status.pidsOnPort.length > 0) {
      console.log(`⚠️  Found ${status.pidsOnPort.length} process(es) on port ${this.backendPort}`);
      
      for (const pid of status.pidsOnPort) {
        const processInfo = await this.getProcessInfo(pid);
        if (processInfo) {
          console.log(`🔍 Process ${pid}: ${processInfo.command}`);
          
          // Only kill if it looks like our backend
          if (processInfo.command.includes('server.js') || 
              processInfo.command.includes('node') && processInfo.command.includes('backend')) {
            console.log(`🛑 Killing backend process ${pid}`);
            await this.killProcess(pid);
          } else {
            console.log(`⚠️  Skipping process ${pid} (doesn't look like our backend)`);
          }
        }
      }
    }
    
    console.log('✅ Cleanup complete');
  }

  /**
   * Test port availability
   */
  async testPortAvailability(startPort = 8000, maxPorts = 10) {
    console.log(`🔍 Testing port availability starting from ${startPort}...\n`);
    
    for (let i = 0; i < maxPorts; i++) {
      const port = startPort + i;
      const inUse = await this.isPortInUse(port);
      console.log(`Port ${port}: ${inUse ? '❌ In use' : '✅ Available'}`);
      
      if (inUse) {
        const pids = await this.findProcessesOnPort(port);
        if (pids.length > 0) {
          console.log(`   Used by PIDs: ${pids.join(', ')}`);
        }
      }
    }
  }

  /**
   * Start backend manually for testing
   */
  async startBackendForTesting() {
    console.log('🚀 Starting backend for testing...\n');
    
    const backendPath = path.join(__dirname, '../server.js');
    
    if (!fs.existsSync(backendPath)) {
      console.error('❌ Backend server file not found:', backendPath);
      return;
    }
    
    const backend = spawn('node', [backendPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, PORT: this.backendPort.toString() }
    });
    
    console.log(`📡 Backend started with PID: ${backend.pid}`);
    console.log(`🔌 Listening on port: ${this.backendPort}`);
    
    // Handle process events
    backend.on('error', (error) => {
      console.error('❌ Backend error:', error);
    });
    
    backend.on('exit', (code) => {
      console.log(`🛑 Backend exited with code: ${code}`);
    });
    
    // Save PID
    fs.writeFileSync(this.pidFile, backend.pid.toString());
    console.log(`💾 PID saved to: ${this.pidFile}`);
    
    return backend;
  }
}

// CLI interface
async function main() {
  const utility = new ProcessUtility();
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await utility.checkBackendStatus();
      break;
      
    case 'cleanup':
      await utility.cleanupZombieProcesses();
      break;
      
    case 'test-ports':
      const startPort = parseInt(process.argv[3]) || 8000;
      await utility.testPortAvailability(startPort);
      break;
      
    case 'start':
      await utility.startBackendForTesting();
      break;
      
    default:
      console.log('🔧 MyFinance Process Management Utility\n');
      console.log('Usage: node processUtility.js <command> [options]\n');
      console.log('Commands:');
      console.log('  status       - Check backend status and port usage');
      console.log('  cleanup      - Clean up zombie processes and stale PID files');
      console.log('  test-ports   - Test port availability (optional: start port)');
      console.log('  start        - Start backend manually for testing\n');
      console.log('Examples:');
      console.log('  node processUtility.js status');
      console.log('  node processUtility.js cleanup');
      console.log('  node processUtility.js test-ports 8000');
      console.log('  node processUtility.js start');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProcessUtility;
