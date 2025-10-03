# MyFinance Dashboard - Release Management Guide

## Overview

This guide covers the complete release management process for MyFinance Dashboard, including versioning, building, testing, and distribution.

**🚀 Updated for Node.js Backend**: This release management now supports the new Node.js backend architecture.

## Version Strategy

We use [Semantic Versioning (SemVer)](https://semver.org/) with the following format:
- `MAJOR.MINOR.PATCH-PRERELEASE.BUILD`

### Version Types

- **Alpha** (`0.1.0-alpha.1`): Early development releases, unstable features
- **Beta** (`0.1.0-beta.1`): Feature-complete, testing phase
- **Release Candidate** (`0.1.0-rc.1`): Final testing before stable release
- **Stable** (`0.1.0`): Production-ready releases

### Current Version: `0.1.0-alpha.1`

## Quick Start

### Creating a New Release

```bash
# For alpha releases (recommended for early development)
node scripts/release-manager.js alpha

# For patch releases (bug fixes)
node scripts/release-manager.js patch

# For minor releases (new features)
node scripts/release-manager.js minor

# For major releases (breaking changes)
node scripts/release-manager.js major
```

### Manual Release Process

```bash
# 1. Clean and prepare
npm run release:clean

# 2. Create release
npm run release:alpha  # or patch, minor, major

# 3. Push to repository
git push origin main
git push origin v0.1.0-alpha.2  # Replace with actual version
```

## Release Workflow

### Pre-Release Checklist

- [ ] All features are implemented and tested
- [ ] Database migrations are ready (if any)
- [ ] Documentation is updated
- [ ] Screenshots are updated (run `npm run screenshots`)
- [ ] No critical bugs are open
- [ ] Working directory is clean (`git status`)

### Release Process

1. **Version Bump**: Update version numbers in `package.json` files
2. **Build**: Compile frontend and create Electron distribution
3. **Test**: Verify the build works on target platforms
4. **Document**: Generate release notes and changelog
5. **Commit**: Commit version changes and create git tag
6. **Distribute**: Upload to GitHub releases or distribution platform

### Post-Release Checklist

- [ ] Verify build artifacts in `dist/` folder
- [ ] Test installation on target platforms
- [ ] Update documentation
- [ ] Notify users of new release
- [ ] Monitor for issues and feedback

## Build Artifacts

After a successful release, the following files are created:

```
dist/
├── MyFinance Dashboard-0.1.0-alpha.1.dmg          # macOS installer
├── MyFinance Dashboard Setup 0.1.0-alpha.1.exe    # Windows installer
├── MyFinance Dashboard-0.1.0-alpha.1.AppImage     # Linux AppImage
└── latest-mac.yml                                  # Update metadata
```

## Automated Releases with GitHub Actions

The project includes GitHub Actions workflows for automated releases:

- **Trigger**: Push a version tag (e.g., `v0.1.0-alpha.1`)
- **Platforms**: macOS, Windows, Linux
- **Artifacts**: Platform-specific installers
- **Release**: Automatic GitHub release creation

### Manual GitHub Release

1. Go to GitHub repository → Releases
2. Click "Create a new release"
3. Choose tag: `v0.1.0-alpha.1`
4. Upload build artifacts from `dist/` folder
5. Use generated release notes from `RELEASE_NOTES.md`

## Development Workflow

### Daily Development

```bash
# Start development environment with Node.js backend
npm run start-nodejs

# Or start individual components
npm run backend-nodejs  # Start Node.js backend
npm run frontend        # Start React frontend
npm run electron        # Start Electron app

# Run tests
node test-nodejs-backend.js

# Update screenshots
npm run screenshots
```

### Pre-Release Testing

```bash
# Build and test locally
npm run release:prepare

# Test the built application
# Check dist/ folder for installers
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check Node.js version (Python no longer required)
2. **Missing Dependencies**: Run `npm ci` and `cd backend-nodejs && npm ci`
3. **Backend Issues**: Test with `node test-nodejs-backend.js`
4. **Git Issues**: Ensure working directory is clean
5. **Version Conflicts**: Check both `package.json` files have same version

### Recovery

If a release fails:

```bash
# Reset to previous version
git reset --hard HEAD~1
git tag -d v0.1.0-alpha.1  # Remove bad tag
npm run release:clean      # Clean build artifacts
```

## Release Notes Template

Release notes are automatically generated but can be customized:

```markdown
# MyFinance Dashboard v0.1.0-alpha.1

## Release Date
2024-01-15

## Changes
- Initial alpha release
- Basic transaction import functionality
- Account management features
- Category management system

## Installation
Download the appropriate installer for your platform from the `dist/` folder.

## Alpha Release Notes
This is an early alpha release. Please report any issues or feedback.

## Known Issues
- [ ] Add known issues here as they are discovered

## Next Steps
- [ ] Add planned features for next release
```

## Support

For release-related issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Test locally with `npm run release:prepare`
4. Create an issue with detailed error information

## Future Enhancements

- [ ] Automated testing in CI/CD
- [ ] Code signing for macOS/Windows
- [ ] Auto-updater integration
- [ ] Release rollback mechanism
- [ ] Performance monitoring
