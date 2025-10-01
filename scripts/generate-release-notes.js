#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json to get current version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Get git commit history since last tag
let gitLog = '';
try {
  // Get the last tag
  const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  gitLog = execSync(`git log ${lastTag}..HEAD --oneline --pretty=format:"- %s"`, { encoding: 'utf8' });
} catch (error) {
  // If no tags exist, get all commits
  gitLog = execSync('git log --oneline --pretty=format:"- %s"', { encoding: 'utf8' });
}

// Generate release notes
const releaseNotes = `# MyFinance Dashboard v${version}

## Release Date
${new Date().toISOString().split('T')[0]}

## Changes
${gitLog || '- Initial alpha release'}

## Installation
Download the appropriate installer for your platform from the \`dist/\` folder:
- **macOS**: \`.dmg\` file
- **Windows**: \`.exe\` installer
- **Linux**: \`.AppImage\` file

## Alpha Release Notes
This is an early alpha release. Please report any issues or feedback.

## Known Issues
- [ ] Add known issues here as they are discovered

## Next Steps
- [ ] Add planned features for next release
`;

// Write release notes to file
const releaseNotesPath = path.join(__dirname, '../RELEASE_NOTES.md');
fs.writeFileSync(releaseNotesPath, releaseNotes);

// Also create a version-specific release notes file
const versionNotesPath = path.join(__dirname, `../releases/v${version}.md`);
const releasesDir = path.dirname(versionNotesPath);
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}
fs.writeFileSync(versionNotesPath, releaseNotes);

console.log(`✅ Release notes generated for v${version}`);
console.log(`📝 Release notes saved to: ${releaseNotesPath}`);
console.log(`📝 Version-specific notes saved to: ${versionNotesPath}`);
