const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8000',
  screenshotsDir: './screenshots',
  viewport: { width: 1920, height: 1080 },
  waitTime: 2000, // Wait time for page load
  retryAttempts: 3
};

// Screenshot definitions
const SCREENSHOTS = [
  {
    name: 'home-dashboard',
    path: '/',
    description: 'Main dashboard with financial overview',
    waitFor: '.dashboard-container, .MuiContainer-root'
  },
  {
    name: 'file-upload',
    path: '/upload',
    description: 'File upload interface for bank statements',
    waitFor: '.upload-container, .MuiBox-root'
  },
  {
    name: 'transactions-list',
    path: '/transactions',
    description: 'Transactions list and management',
    waitFor: '.transactions-container, .MuiTableContainer-root'
  },
  {
    name: 'analytics-visualizations',
    path: '/analytics',
    description: 'Analytics and data visualizations',
    waitFor: '.analytics-container, .recharts-wrapper'
  },
  {
    name: 'accounts-management',
    path: '/accounts',
    description: 'Bank accounts management',
    waitFor: '.accounts-container, .MuiCard-root'
  },
  {
    name: 'settings-page',
    path: '/settings',
    description: 'Application settings and preferences',
    waitFor: '.settings-container, .MuiFormControl-root'
  }
];

class ScreenshotAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting screenshot automation...');
    
    // Ensure screenshots directory exists
    if (!fs.existsSync(CONFIG.screenshotsDir)) {
      fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
    }

    // Launch browser
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize(CONFIG.viewport);
    
    console.log('✅ Browser initialized');
  }

  async checkServerHealth() {
    console.log('🔍 Checking server health...');
    
    try {
      // Check if frontend is running
      const frontendResponse = await this.page.goto(CONFIG.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      if (frontendResponse.status() !== 200) {
        throw new Error(`Frontend server returned status ${frontendResponse.status()}`);
      }
      
      console.log('✅ Frontend server is running');
      
      // Check if backend is running
      const backendResponse = await this.page.request.get(CONFIG.backendUrl + '/api/');
      if (backendResponse.status() !== 200) {
        console.log('⚠️  Backend server might not be running, but continuing...');
      } else {
        console.log('✅ Backend server is running');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Server health check failed:', error.message);
      console.log('\n💡 Make sure both servers are running:');
      console.log('   Frontend: cd frontend && npm start');
      console.log('   Backend: python manage.py runserver');
      return false;
    }
  }

  async captureScreenshot(screenshot) {
    const { name, path: urlPath, description, waitFor } = screenshot;
    const fullUrl = `${CONFIG.baseUrl}${urlPath}`;
    
    console.log(`📸 Capturing: ${name} (${description})`);
    
    try {
      // Navigate to the page
      await this.page.goto(fullUrl, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      // Wait for specific elements if specified
      if (waitFor) {
        try {
          await this.page.waitForSelector(waitFor, { timeout: 10000 });
        } catch (error) {
          console.log(`⚠️  Could not find selector ${waitFor}, proceeding anyway...`);
        }
      }
      
      // Additional wait for animations/loading
      await this.page.waitForTimeout(CONFIG.waitTime);
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotsDir, `${name}.png`);
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled'
      });
      
      console.log(`✅ Saved: ${screenshotPath}`);
      
      this.results.push({
        name,
        path: screenshotPath,
        description,
        status: 'success',
        url: fullUrl
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to capture ${name}:`, error.message);
      
      this.results.push({
        name,
        path: null,
        description,
        status: 'failed',
        error: error.message,
        url: fullUrl
      });
      
      return false;
    }
  }

  async captureAllScreenshots() {
    console.log(`\n📋 Capturing ${SCREENSHOTS.length} screenshots...\n`);
    
    let successCount = 0;
    
    for (const screenshot of SCREENSHOTS) {
      const success = await this.captureScreenshot(screenshot);
      if (success) successCount++;
      
      // Small delay between screenshots
      await this.page.waitForTimeout(1000);
    }
    
    console.log(`\n📊 Results: ${successCount}/${SCREENSHOTS.length} screenshots captured successfully`);
    
    return successCount;
  }

  async generateReport() {
    const reportPath = path.join(CONFIG.screenshotsDir, 'screenshot-report.md');
    
    let report = `# Screenshot Automation Report\n\n`;
    report += `Generated on: ${new Date().toLocaleString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total screenshots: ${this.results.length}\n`;
    report += `- Successful: ${this.results.filter(r => r.status === 'success').length}\n`;
    report += `- Failed: ${this.results.filter(r => r.status === 'failed').length}\n\n`;
    
    report += `## Screenshots\n\n`;
    
    this.results.forEach(result => {
      report += `### ${result.name}\n`;
      report += `- **Description**: ${result.description}\n`;
      report += `- **URL**: ${result.url}\n`;
      report += `- **Status**: ${result.status === 'success' ? '✅ Success' : '❌ Failed'}\n`;
      
      if (result.status === 'success') {
        report += `- **File**: \`${result.path}\`\n`;
      } else {
        report += `- **Error**: ${result.error}\n`;
      }
      
      report += `\n`;
    });
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Cleanup completed');
  }

  async run() {
    try {
      await this.init();
      
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        process.exit(1);
      }
      
      await this.captureAllScreenshots();
      await this.generateReport();
      
    } catch (error) {
      console.error('💥 Automation failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');
const shouldCaptureAll = args.includes('--all');

if (shouldUpdate) {
  console.log('🔄 Update mode: Will capture all screenshots');
}

if (shouldCaptureAll) {
  console.log('📸 All screenshots mode: Capturing comprehensive set');
}

// Run the automation
const automation = new ScreenshotAutomation();
automation.run().catch(console.error);
