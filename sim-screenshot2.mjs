import { chromium } from 'playwright';

// 既存のブラウザに接続するのではなく、新しいブラウザで現在の画面を確認
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ permissions: ['notifications'], viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

await page.locator('input[placeholder*="管理番号"]').first().fill('0001');
await page.locator('input[type="password"]').first().fill('Test1234');
await page.locator('button:has-text("ログイン")').first().click();
await page.waitForTimeout(2000);

const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
}

await page.screenshot({ path: 'sim-screenshot2.png', fullPage: true });
console.log('スクリーンショット保存: sim-screenshot2.png');

// ボタン一覧
const buttons = await page.locator('button').all();
console.log('現在の画面のボタン:');
for (const btn of buttons) {
  const text = await btn.textContent();
  const visible = await btn.isVisible();
  if (visible) console.log(' -', text?.trim());
}

await browser.close();
