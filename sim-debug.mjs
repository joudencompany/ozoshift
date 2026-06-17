import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ permissions: ['notifications'] });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// ページ上のボタンテキストを全部取得
const buttons = await page.locator('button').all();
console.log('ボタン一覧:');
for (const btn of buttons) {
  const text = await btn.textContent();
  console.log(' -', text?.trim());
}

// スクリーンショット保存
await page.screenshot({ path: 'sim-screenshot.png' });
console.log('スクリーンショット: sim-screenshot.png');

await browser.close();
