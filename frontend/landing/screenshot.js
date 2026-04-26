const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to a nice laptop size
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to Institute Dashboard...');
  await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle2' });
  
  // Wait a bit for animations/charts to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const outPath = path.join(__dirname, 'public', 'dashboard-screenshot.png');
  await page.screenshot({ path: outPath });
  console.log('Screenshot saved to', outPath);

  await browser.close();
})();
