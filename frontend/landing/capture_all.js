const puppeteer = require('puppeteer');
const path = require('path');

const routes = [
  { url: '/dashboard', file: 'dashboard.png' },
  { url: '/accounts', file: 'accounts.png' },
  { url: '/teachers', file: 'teachers.png' },
  { url: '/attendance', file: 'attendance.png' },
  { url: '/exams', file: 'exams.png' },
  { url: '/timetable', file: 'timetable.png' },
  { url: '/notifications', file: 'notifications.png' },
  { url: '/promotion', file: 'promotion.png' },
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const route of routes) {
    console.log(`Capturing ${route.url}...`);
    await page.goto(`http://localhost:3001${route.url}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000)); // wait for animations
    const outPath = path.join(__dirname, 'public', 'screens', route.file);
    await page.screenshot({ path: outPath });
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
})();
