import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

await page.locator('input[placeholder*="管理番号"]').first().fill('0000');
await page.locator('input[type="password"]').first().fill('Test1234');
await page.locator('button:has-text("ログイン")').first().click();
await page.waitForTimeout(2000);

const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
}

// オーナーパスワード入力が必要か確認
const allButtons = await page.locator('button:visible').allTextContents();
console.log('ボタン:', allButtons);

await page.screenshot({ path: 'sim-ss3.png', fullPage: true });
console.log('スクリーンショット保存');
await browser.close();
