# 📸 Screenshot Automation Tool

This project includes an automated screenshot tool that captures high-quality screenshots of all major application pages for documentation, testing, and presentation purposes.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Playwright installed
- Both frontend and backend servers running

### Installation
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Running Screenshots
```bash
# Capture all screenshots
npm run screenshots

# Update existing screenshots
npm run screenshots:update

# Capture comprehensive set
npm run screenshots:all

# Show help
npm run screenshots:help
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run screenshots` | Capture all screenshots |
| `npm run screenshots:update` | Update existing screenshots |
| `npm run screenshots:all` | Capture comprehensive set |
| `npm run screenshots:help` | Show available commands |

## 🖼️ Screenshots Captured

The tool captures screenshots of the following pages:

1. **Home Dashboard** (`/`) - Main dashboard with financial overview
2. **File Upload** (`/upload`) - File upload interface for bank statements
3. **Transactions List** (`/transactions`) - Transactions list (limited to first 20 results)
4. **Categories Management** (`/categorization`) - Transaction categorization and management
5. **Analytics & Visualizations** (`/visualizations`) - Analytics and data visualizations
6. **Accounts Management** (`/accounts`) - Bank accounts management
7. **Rules Management** (`/rules`) - Transaction rules and automation management
8. **Settings Page** (`/user-settings`) - Application settings and preferences

## ⚙️ Configuration

### Viewport Settings
- **Width**: 1600px
- **Height**: 900px
- **Zoom**: 120% for better readability

### Wait Times
- **Page Load**: 3 seconds
- **Element Wait**: 10 seconds
- **Between Screenshots**: 1 second

### Custom Actions
- **Transaction Limiting**: Automatically limits transaction list to first 20 items for cleaner screenshots

## 📁 Output

Screenshots are saved to the `./screenshots/` directory with descriptive filenames:
- `home-dashboard.png`
- `file-upload.png`
- `transactions-list.png`
- `categories-management.png`
- `analytics-visualizations.png`
- `accounts-management.png`
- `rules-management.png`
- `settings-page.png`

A detailed report is generated at `./screenshots/screenshot-report.md` with:
- Summary of successful/failed captures
- URLs and descriptions for each screenshot
- Error details for any failures

## �� Customization

### Adding New Pages
Edit `scripts/screenshot-automation.js` and add new entries to the `SCREENSHOTS` array:

```javascript
{
  name: 'new-page',
  path: '/new-page',
  description: 'Description of the new page',
  waitFor: '.selector-for-page-content'
}
```

### Modifying Settings
Update the `CONFIG` object in `scripts/screenshot-automation.js`:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3001', // Updated to match frontend port
  backendUrl: 'http://localhost:8000',
  screenshotsDir: './screenshots',
  viewport: { width: 1600, height: 900 },
  zoom: 1.2,
  waitTime: 3000,
  retryAttempts: 3
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   Error: Server health check failed
   ```
   **Solution**: Ensure both frontend and backend servers are running:
   ```bash
   # Frontend
   cd frontend && npm start
   
   # Backend
   python manage.py runserver
   ```

2. **Screenshots Not Capturing**
   ```
   Error: Could not find selector
   ```
   **Solution**: Check if the page is loading correctly and update the `waitFor` selector

3. **Timeout Errors**
   ```
   Error: Timeout 10000ms exceeded
   ```
   **Solution**: Increase `waitTime` in the CONFIG or check page loading performance

### Debug Mode
Run with debug logging to see detailed information:
```bash
DEBUG=pw:api npm run screenshots
```

## 📊 Features

- ✅ **Automated**: No manual screenshot taking required
- ✅ **High Quality**: 1600x900 resolution with 120% zoom
- ✅ **Comprehensive**: Covers all major application pages
- ✅ **Configurable**: Easy to add new pages or modify settings
- ✅ **Error Handling**: Robust error handling and retry logic
- ✅ **Reporting**: Generates detailed reports
- ✅ **Custom Actions**: Smart features like transaction limiting

## 🎯 Use Cases

- **Documentation**: Generate visual documentation for your application
- **Testing**: Verify UI changes across different pages
- **Presentations**: Create visual materials for demos and presentations
- **Quality Assurance**: Ensure consistent UI across all pages
- **Onboarding**: Help new team members understand the application structure

## 📝 Notes

- Screenshots are captured in headless mode for consistency
- The tool automatically handles page loading and element waiting
- Failed screenshots are logged with detailed error information
- All screenshots are full-page captures for complete page visibility
