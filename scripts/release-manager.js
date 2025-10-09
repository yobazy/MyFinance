#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

function getCurrentVersion() {
  return packageJson.version;
}

function updateVersion(type) {
  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);
  
  let newVersion;
  switch (type) {
    case 'patch':
      newVersion = currentVersion.replace(/\.(\d+)(?:-.*)?$/, (match, patch) => {
        return `.${parseInt(patch) + 1}`;
      });
      break;
    case 'minor':
      newVersion = currentVersion.replace(/\.(\d+)\.(\d+)(?:-.*)?$/, (match, minor, patch) => {
        return `.${parseInt(minor) + 1}.0`;
      });
      break;
    case 'major':
      newVersion = currentVersion.replace(/^(\d+)\./, (match, major) => {
        return `${parseInt(major) + 1}.`;
      }).replace(/\.\d+\.\d+.*$/, '.0.0');
      break;
    case 'alpha':
      if (currentVersion.includes('-alpha.')) {
        newVersion = currentVersion.replace(/-alpha\.(\d+)/, (match, num) => {
          return `-alpha.${parseInt(num) + 1}`;
        });
      } else {
        newVersion = `${currentVersion}-alpha.1`;
      }
      break;
    case 'beta':
      if (currentVersion.includes('-beta.')) {
        newVersion = currentVersion.replace(/-beta\.(\d+)/, (match, num) => {
          return `-beta.${parseInt(num) + 1}`;
        });
      } else {
        // Remove any existing pre-release identifier and add beta
        newVersion = currentVersion.replace(/-.*$/, '') + '-beta.1';
      }
      break;
    case 'rc':
      if (currentVersion.includes('-rc.')) {
        newVersion = currentVersion.replace(/-rc\.(\d+)/, (match, num) => {
          return `-rc.${parseInt(num) + 1}`;
        });
      } else {
        // Remove any existing pre-release identifier and add rc
        newVersion = currentVersion.replace(/-.*$/, '') + '-rc.1';
      }
      break;
    default:
      console.error(`Unknown version type: ${type}`);
      process.exit(1);
  }
  
  return newVersion;
}

function updatePackageJson(newVersion) {
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Update frontend package.json
  const frontendPackageJsonPath = path.join(__dirname, '../frontend/package.json');
  const frontendPackageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'));
  frontendPackageJson.version = newVersion;
  fs.writeFileSync(frontendPackageJsonPath, JSON.stringify(frontendPackageJson, null, 2));
}

function createRelease(type) {
  console.log(`🚀 Creating ${type} release...`);
  
  // Check if working directory is clean
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.error('❌ Working directory is not clean. Please commit or stash changes first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking git status:', error.message);
    process.exit(1);
  }
  
  const newVersion = updateVersion(type);
  console.log(`📝 Updating version to: ${newVersion}`);
  
  updatePackageJson(newVersion);
  
  // Build the application
  console.log('🔨 Building application...');
  try {
    execSync('npm run release:build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  // Commit changes
  console.log('📝 Committing changes...');
  execSync(`git add package.json frontend/package.json RELEASE_NOTES.md releases/`, { stdio: 'inherit' });
  execSync(`git commit -m "Release v${newVersion}"`, { stdio: 'inherit' });
  
  // Create tag
  console.log('🏷️  Creating git tag...');
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
  
  console.log(`✅ Release v${newVersion} created successfully!`);
  console.log(`📦 Build artifacts are in the dist/ folder`);
  console.log(`📝 Release notes: RELEASE_NOTES.md`);
  console.log(`🏷️  Git tag: v${newVersion}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Push the tag: git push origin v' + newVersion);
  console.log('2. Push commits: git push origin main');
  console.log('3. Test the build artifacts in dist/');
  console.log('4. Create a GitHub release if desired');
}

function showHelp() {
  console.log(`
MyFinance Dashboard Release Manager

Usage: node scripts/release-manager.js <command>

Commands:
  patch     Create a patch release (0.1.0 -> 0.1.1)
  minor     Create a minor release (0.1.0 -> 0.2.0)
  major     Create a major release (0.1.0 -> 1.0.0)
  alpha     Create an alpha release (0.1.0 -> 0.1.0-alpha.1)
  beta      Create a beta release (0.1.0-alpha.4 -> 0.1.0-beta.1)
  rc        Create a release candidate (0.1.0-alpha.4 -> 0.1.0-rc.1)
  help      Show this help message

Examples:
  node scripts/release-manager.js alpha    # Create alpha release
  node scripts/release-manager.js patch    # Create patch release
  node scripts/release-manager.js help     # Show help

Current version: ${getCurrentVersion()}
`);
}

// Main execution
switch (command) {
  case 'patch':
  case 'minor':
  case 'major':
  case 'alpha':
  case 'beta':
  case 'rc':
    createRelease(command);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
