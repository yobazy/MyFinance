// Updated startBackend function for standalone Python executable
function startBackend() {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;
    let backendExecutable;
    let args;
    
    if (isDev) {
      // Development mode - use system Python
      backendExecutable = process.platform === 'win32' ? 'python' : 'python3';
      args = ['manage.py', 'runserver', '8000', '--noreload'];
    } else {
      // Production mode - use bundled executable
      if (process.platform === 'win32') {
        backendExecutable = path.join(__dirname, '..', 'myfinance-backend.exe');
      } else {
        backendExecutable = path.join(__dirname, '..', 'myfinance-backend');
      }
      args = ['runserver', '8000', '--noreload'];
    }
    
    const projectRoot = isDev ? path.join(__dirname, '..') : path.join(__dirname, '..');
    
    console.log('Starting Django backend...');
    console.log('Executable:', backendExecutable);
    console.log('Args:', args);
    console.log('Working directory:', projectRoot);
    console.log('Is packaged:', app.isPackaged);
    
    try {
      backendProcess = spawn(backendExecutable, args, {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Backend:', output);
        
        // Check if server is ready - Django shows different messages
        if (output.includes('Starting development server') || 
            output.includes('Quit the server with') ||
            output.includes('Watching for file changes') ||
            output.includes('System check identified no issues')) {
          console.log('✅ Backend server is ready');
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Backend Error:', error);
        
        // Handle port already in use error
        if (error.includes('That port is already in use')) {
          console.log('Port 8000 is in use, trying port 8001...');
          backendProcess.kill();
          
          // Try alternative port
          const newArgs = [...args];
          newArgs[newArgs.length - 2] = '8001'; // Replace port number
          
          backendProcess = spawn(backendExecutable, newArgs, {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          backendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Backend (Port 8001):', output);
            
            if (output.includes('Starting development server') || 
                output.includes('Quit the server with') ||
                output.includes('Watching for file changes') ||
                output.includes('System check identified no issues')) {
              console.log('✅ Backend server is ready on port 8001');
              resolve();
            }
          });
        }
      });

      backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error);
        reject(error);
      });

      backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
      });

    } catch (error) {
      console.error('Error spawning backend process:', error);
      reject(error);
    }
  });
}
