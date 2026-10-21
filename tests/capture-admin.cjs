const { chromium } = require('C:/Users/Kyle Benj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/*', r => {
      if (r.request().url().includes('/js/core/auth.js')) {
        return r.fulfill({
          contentType: 'text/javascript',
          body: `let ROLE = 'admin';
let CURRENT_PROFILE = {
  id: 'admin-demo-id',
  full_name: 'Mr. S. Llorente Jr.',
  role: 'admin',
  is_demo: true
};
const API_BASE = location.origin;
const db = {
  channel: () => { const c = { on: () => c, subscribe: () => c }; return c; },
  auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) },
  from: () => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      insert: async () => ({ error: null }),
      then: resolve => Promise.resolve({ data: [], error: null }).then(resolve)
    };
    return q;
  }
};
function guardSessionAndInit() {
  initDashboardShell();
}
window.guardSessionAndInit = guardSessionAndInit;
`
        });
      }
      return r.continue();
    });
    await page.goto('http://localhost:3001/dashboard.html');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      ROLE = 'admin';
      CURRENT_PROFILE = {
        id: 'admin-demo-id',
        full_name: 'Mr. S. Llorente Jr.',
        role: 'admin',
        is_demo: true
      };
      if (typeof initDashboardShell === 'function') initDashboardShell();
      if (typeof renderPage === 'function') renderPage('dashboard');
    });
    await page.waitForTimeout(1500);
    const screenshotPath = path.resolve(__dirname, 'admin-current.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Saved screenshot to', screenshotPath);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
