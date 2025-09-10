# 📸 Automated Screenshot System

This project includes an automated screenshot system that captures high-quality screenshots of your MyFinance Dashboard application for documentation, GitHub README, and visual testing purposes.

## 🚀 Quick Start

### 1. Setup (One-time)
```bash
# Run the setup script
./scripts/setup-screenshots.sh

# Or manually:
npm install
npx playwright install
```

### 2. Start Your Application
```bash
# Terminal 1: Start Django backend
python manage.py runserver

# Terminal 2: Start React frontend
cd frontend
npm start
```

### 3. Capture Screenshots
```bash
# Capture all screenshots
npm run screenshots

# Update existing screenshots
npm run screenshots:update

# Capture comprehensive set
npm run screenshots:all
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run screenshots` | Capture all configured screenshots |
| `npm run screenshots:update` | Update existing screenshots |
| `npm run screenshots:all` | Capture comprehensive screenshot set |
| `npm run screenshots:help` | Show available commands |

## 🎯 What Gets Captured

The automation captures screenshots of these key pages:

1. **Home Dashboard** (`/`) - Main financial overview
2. **File Upload** (`/upload`) - Bank statement upload interface
3. **Transactions List** (`/transactions`) - Transaction management
4. **Analytics** (`/analytics`) - Data visualizations and charts
5. **Accounts Management** (`/accounts`) - Bank account management
6. **Settings** (`/settings`) - Application preferences

## 📁 Output

- **Screenshots**: Saved to `./screenshots/` directory
- **Report**: Generated as `./screenshots/screenshot-report.md`
- **Format**: High-resolution PNG files (1920x1080)
- **Naming**: Descriptive names (e.g., `home-dashboard.png`)

## ⚙️ Configuration

The automation can be customized by editing `scripts/screenshot-automation.js`:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3000',        // Frontend URL
  backendUrl: 'http://localhost:8000',     // Backend URL
  screenshotsDir: './screenshots',         // Output directory
  viewport: { width: 1920, height: 1080 }, // Screenshot resolution
  waitTime: 2000,                          // Wait time for page load
  retryAttempts: 3                         // Retry attempts on failure
};
```

## 🔧 Adding New Screenshots

To add new screenshots, edit the `SCREENSHOTS` array in `scripts/screenshot-automation.js`:

```javascript
{
  name: 'new-page',
  path: '/new-page',
  description: 'Description of the new page',
  waitFor: '.specific-selector' // Optional: wait for specific element
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Servers not running**
   ```
   Error: Server health check failed
   Solution: Make sure both frontend and backend servers are running
   ```

2. **Page not loading**
   ```
   Error: Navigation timeout
   Solution: Check if the page URL is correct and accessible
   ```

3. **Element not found**
   ```
   Warning: Could not find selector
   Solution: Update the waitFor selector or remove it
   ```

### Debug Mode

Run with debug output:
```bash
DEBUG=pw:api npm run screenshots
```

## 🤖 GitHub Actions Integration

The project includes a GitHub Actions workflow (`.github/workflows/screenshots.yml`) that automatically captures screenshots on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

Screenshots are uploaded as artifacts and can be used in PR comments.

## 📊 Features

- ✅ **Automated**: No manual screenshot taking required
- ✅ **High Quality**: 1920x1080 resolution screenshots
- ✅ **Comprehensive**: Covers all major application pages
- ✅ **Configurable**: Easy to add new pages or modify settings
- ✅ **CI/CD Ready**: GitHub Actions integration
- ✅ **Error Handling**: Robust error handling and retry logic
- ✅ **Reporting**: Generates detailed reports
- ✅ **Cross-platform**: Works on macOS, Linux, and Windows

## 🎨 Best Practices

1. **Keep servers running**: Always ensure both frontend and backend are running
2. **Test data**: Use consistent test data for predictable screenshots
3. **Wait for loading**: The script includes wait times, but you may need to adjust them
4. **Clean state**: Start with a clean application state for consistent results
5. **Regular updates**: Run screenshots regularly to keep documentation current

## 📝 Integration with README

You can easily integrate screenshots into your README:

```markdown
## Screenshots

### Dashboard
![Dashboard](screenshots/home-dashboard.png)

### File Upload
![File Upload](screenshots/file-upload.png)

### Analytics
![Analytics](screenshots/analytics-visualizations.png)
```

## 🔄 Maintenance

- **Regular updates**: Run `npm run screenshots:update` when you make UI changes
- **New features**: Add new screenshots when you add new pages
- **Dependencies**: Keep Playwright updated: `npx playwright install`
- **Testing**: Test the automation after major UI changes

---

*This automation system saves you time and ensures your documentation always has up-to-date screenshots!* 🎉
