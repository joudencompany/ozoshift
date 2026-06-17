import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// 管理番号 0000 でログイン
await page.locator('input[placeholder*="管理番号"]').first().fill('0000');
await page.locator('input[type="password"]').first().fill('Test1234');
await page.locator('button:has-text("ログイン")').first().click();
await page.waitForTimeout(2000);

// オーナーボタンをクリック
const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
  console.log('✅ オーナーメニューに入りました');
} else {
  console.log('❌ オーナーボタンが見つかりません');
}

console.log('👆 通知の「受け取る」ボタンを押してください。');
console.log('   ブラウザを閉じるまで待機します。');

await page.waitForEvent('close', { timeout: 300000 }).catch(() => {});
await browser.close();
console.log('完了');
