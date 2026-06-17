import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox']
});

// 通知権限を「prompt」にして手動で許可させる
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 }
});

const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// 管理番号入力
const numInput = page.locator('input[placeholder*="管理番号"]').first();
await numInput.waitFor({ timeout: 10000 });
await numInput.fill('0001');

// パスワード入力
await page.locator('input[type="password"]').first().fill('Test1234');

// ログイン
await page.locator('button:has-text("ログイン")').first().click();
await page.waitForTimeout(2000);

// ロール選択（オーナー）
const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(1500);
}

console.log('✅ ログイン完了');
console.log('👆 ブラウザが開いています。通知の許可ボタンを押してください。');
console.log('   許可後、Supabaseに購読情報が保存されます。');
console.log('   ブラウザを閉じるまでこのスクリプトは待機します。');

// ブラウザが閉じられるまで待機
await page.waitForEvent('close', { timeout: 300000 }).catch(() => {});
await browser.close();
console.log('ブラウザが閉じられました。');
