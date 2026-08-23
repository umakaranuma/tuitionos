const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');

const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:8000';
const INSTITUTE_ORIGIN = 'http://localhost:3001';
// Sign in for real so we get back the same {token, user} shape the login
// page itself stores — several pages (Timetable, Notifications, Year-end
// Promotion) gate on `user.institute.plan` read from localStorage, so a
// token alone isn't enough to unlock them.
const EMAIL = process.env.EMAIL || 'sundar@stpatricks.lk';
const PASSWORD = process.env.PASSWORD || 'institute123';

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

function loginViaApi() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const req = http.request(`${API_ORIGIN}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Login failed: ${res.statusCode} ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const { token, user } = await loginViaApi();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Seed the same localStorage keys a real login sets, before any app code
  // runs, on every navigation, so each protected/plan-gated route loads as
  // a genuinely logged-in institute_pro user.
  await page.evaluateOnNewDocument((token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, token, user);

  for (const route of routes) {
    console.log(`Capturing ${route.url}...`);
    await page.goto(`${INSTITUTE_ORIGIN}${route.url}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000)); // wait for animations
    const outPath = path.join(__dirname, 'public', 'screens', route.file);
    await page.screenshot({ path: outPath });
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
})();
