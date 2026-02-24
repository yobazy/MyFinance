const { chromium } = require('playwright');
const fs = require('fs');

async function testSetup() {
  console.log('🧪 Testing screenshot automation setup...');
  
  try {
    // Test Playwright installation
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Test basic functionality
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://example.com');
    await page.screenshot({ path: './screenshots/test-setup.png' });
    
    await browser.close();
    
    // Check if screenshot was created
    if (fs.existsSync('./screenshots/test-setup.png')) {
      console.log('✅ Playwright is working correctly');
      console.log('✅ Screenshot directory is writable');
      console.log('✅ Basic screenshot functionality works');
      
      // Clean up test file
      fs.unlinkSync('./screenshots/test-setup.png');
      console.log('✅ Test cleanup completed');
      
      console.log('\n🎉 Setup test passed! You can now run:');
      console.log('   npm run screenshots');
    } else {
      throw new Error('Screenshot was not created');
    }
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    console.log('\n�� Try running: npx playwright install');
    process.exit(1);
  }
}

testSetup();
