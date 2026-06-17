import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// オーナーログイン（パスワード: 0306）
const numInput = page.locator('input[placeholder="管理番号"]');
await numInput.click({ clickCount: 3 });
await numInput.pressSequentially('0000', { delay: 100 });

const passInput = page.locator('input[type="password"]');
await passInput.click({ clickCount: 3 });
await passInput.pressSequentially('0306', { delay: 100 });

await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);

// オーナーボタンをクリック
const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
  console.log('✅ オーナーメニューに入りました');
}

const btns = await page.locator('button:visible').allTextContents();
console.log('ボタン:', btns.filter(b => b.trim()));

console.log('\n👆 通知の「受け取る」ボタンを押してください。');
console.log('   ブラウザを閉じるまで待機します。');

await page.waitForEvent('close', { timeout: 300000 }).catch(() => {});
await browser.close();
