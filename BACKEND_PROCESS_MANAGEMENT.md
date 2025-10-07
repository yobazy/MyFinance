# Backend Process Management Best Practices

## Overview

This document outlines the improved backend process management system for the MyFinance desktop application. The new system addresses common issues with desktop application backends including port conflicts, zombie processes, and improper cleanup.

## Problems Addressed

### 1. Port Conflicts
- **Issue**: Multiple backend instances trying to bind to the same port
- **Solution**: Dynamic port detection with automatic fallback
- **Implementation**: `ProcessManager.findAvailablePort()`

### 2. Zombie Processes
- **Issue**: Backend processes not properly terminated, leaving orphaned processes
- **Solution**: PID tracking and cleanup on startup
- **Implementation**: `ProcessManager.killExistingBackend()`

### 3. Process Synchronization
- **Issue**: Frontend starting before backend is ready
- **Solution**: Health check validation with retry logic
- **Implementation**: `ProcessManager.waitForBackendReady()`

### 4. Graceful Shutdown
- **Issue**: Processes not shutting down cleanly
- **Solution**: Proper signal handling and cleanup
- **Implementation**: `ProcessManager.stopBackend()`

## Architecture

### ProcessManager Class

The `ProcessManager` class provides centralized control over backend processes:

```javascript
const ProcessManager = require('./backend-nodejs/utils/processManager');
const processManager = new ProcessManager();

// Start backend with automatic port detection
const backendInfo = await processManager.startBackend(projectRoot, isPackaged);

// Stop backend gracefully
await processManager.stopBackend();
```

### Key Features

1. **Port Management**
   - Automatic port availability detection
   - Fallback to alternative ports
   - Port conflict resolution

2. **Process Tracking**
   - PID file management
   - Process existence validation
   - Zombie process detection

3. **Health Monitoring**
   - HTTP health check validation
   - Retry logic with exponential backoff
   - Connection timeout handling

4. **Graceful Shutdown**
   - SIGTERM signal handling
   - Graceful shutdown timeout
   - Force kill fallback

## Usage

### Starting the Application

The Electron main process now uses the ProcessManager:

```javascript
// In electron/main-nodejs.js
async function startBackend() {
  try {
    processManager = new ProcessManager();
    const backendInfo = await processManager.startBackend(projectRoot, isPackaged);
    console.log(`Backend running on port: ${backendInfo.port}`);
    return backendInfo;
  } catch (error) {
    console.error('Failed to start backend:', error);
    throw error;
  }
}
```

### Process Management Commands

New npm scripts for process management:

```bash
# Check backend status and port usage
npm run process:status

# Clean up zombie processes and stale PID files
npm run process:cleanup

# Test port availability
npm run process:test-ports

# Start backend manually for testing
npm run process:start
```

### Process Utility Script

The `processUtility.js` script provides command-line tools for process management:

```bash
# Check status
node backend-nodejs/utils/processUtility.js status

# Clean up zombie processes
node backend-nodejs/utils/processUtility.js cleanup

# Test port availability
node backend-nodejs/utils/processUtility.js test-ports 8000

# Start backend for testing
node backend-nodejs/utils/processUtility.js start
```

## Best Practices Implementation

### 1. Process Lifecycle Management

**Before Starting Backend:**
- Check for existing processes
- Kill zombie processes
- Clean up stale PID files
- Find available port

**During Backend Operation:**
- Monitor process health
- Track PID for future reference
- Handle process errors gracefully

**On Application Exit:**
- Send SIGTERM to backend
- Wait for graceful shutdown
- Force kill if necessary
- Clean up PID files

### 2. Port Management

**Dynamic Port Allocation:**
```javascript
// Find available port starting from 8000
const port = await processManager.findAvailablePort(8000);
```

**Port Conflict Resolution:**
```javascript
// Check if port is available
const isAvailable = await processManager.isPortAvailable(8000);
if (!isAvailable) {
  // Try next port
  const port = await processManager.findAvailablePort(8001);
}
```

### 3. Health Monitoring

**Backend Health Check:**
```javascript
// Check if backend is responding
const isHealthy = await processManager.checkBackendHealth(port);
if (!isHealthy) {
  // Backend is not responding
  throw new Error('Backend health check failed');
}
```

**Wait for Backend Ready:**
```javascript
// Wait for backend to be ready with retries
const isReady = await processManager.waitForBackendReady(port, 10, 1000);
```

### 4. Error Handling

**Port Conflicts:**
- Detect EADDRINUSE errors
- Automatically try alternative ports
- Provide clear error messages

**Process Failures:**
- Monitor process exit codes
- Handle SIGTERM/SIGKILL signals
- Clean up resources on failure

**Network Issues:**
- Implement connection timeouts
- Retry failed health checks
- Graceful degradation

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   npm run process:status
   
   # Clean up zombie processes
   npm run process:cleanup
   ```

2. **Backend Not Starting**
   ```bash
   # Check backend status
   npm run process:status
   
   # Test port availability
   npm run process:test-ports
   
   # Start backend manually
   npm run process:start
   ```

3. **Multiple Backend Instances**
   ```bash
   # Clean up all processes
   npm run process:cleanup
   
   # Check status
   npm run process:status
   ```

### Debug Information

The ProcessManager provides detailed logging:

```
🚀 Starting Node.js backend with ProcessManager...
🔄 Attempting to kill existing backend process (PID: 12345)
✅ Existing backend process terminated
📡 Using port: 8001
📝 Backend PID saved: 12346
🔄 Checking backend health (attempt 1/10)...
✅ Backend is healthy and ready
✅ Backend started successfully
📡 Backend running on port: 8001
🆔 Backend PID: 12346
```

## Migration Guide

### From Old System

The old system had these issues:
- No port conflict handling
- No zombie process cleanup
- No health check validation
- Basic process management

### To New System

1. **Replace direct spawn calls** with ProcessManager
2. **Add health check validation** before starting frontend
3. **Implement proper cleanup** on app exit
4. **Use process management commands** for troubleshooting

### Code Changes

**Before:**
```javascript
backendProcess = spawn('node', [serverPath], options);
```

**After:**
```javascript
processManager = new ProcessManager();
const backendInfo = await processManager.startBackend(projectRoot, isPackaged);
```

## Testing

### Test Scenarios

1. **Port Conflicts**
   - Start multiple instances
   - Verify automatic port detection
   - Check cleanup on exit

2. **Process Cleanup**
   - Kill backend process externally
   - Restart application
   - Verify cleanup of stale PID files

3. **Health Checks**
   - Start backend with delay
   - Verify health check retries
   - Test connection timeouts

4. **Graceful Shutdown**
   - Start application
   - Close application
   - Verify backend process termination

### Running Tests

```bash
# Test process management
npm run process:status
npm run process:cleanup
npm run process:test-ports

# Test application startup
npm run electron-start

# Test manual backend
npm run process:start
```

## Future Enhancements

1. **Process Monitoring Dashboard**
   - Real-time process status
   - Resource usage monitoring
   - Performance metrics

2. **Automatic Recovery**
   - Restart failed processes
   - Health check automation
   - Error notification system

3. **Multi-Instance Support**
   - Multiple backend instances
   - Load balancing
   - Failover mechanisms

4. **Advanced Process Management**
   - Process priority management
   - Resource limits
   - Process isolation

## Conclusion

The new process management system provides robust, production-ready backend management for desktop applications. It addresses common issues with port conflicts, zombie processes, and improper cleanup while providing comprehensive monitoring and debugging tools.

The system follows industry best practices for process management and provides a solid foundation for reliable desktop application operation.
