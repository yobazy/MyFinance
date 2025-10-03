  // Build the application
  console.log('🔨 Building application...');
  try {
    // Build standalone Python backend first
    console.log('📦 Building standalone Python backend...');
    execSync('chmod +x build-backend.sh && ./build-backend.sh', { stdio: 'inherit' });
    
    // Then run the standard build
    execSync('npm run release:build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
