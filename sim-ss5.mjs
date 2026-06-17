import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const numInput = page.locator('input[placeholder="管理番号"]');
await numInput.click({ clickCount: 3 });
await numInput.pressSequentially('0000', { delay: 100 });
await page.locator('input[type="password"]').click({ clickCount: 3 });
await page.locator('input[type="password"]').pressSequentially('0306', { delay: 100 });
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);

const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
}

// オーナーパスワード入力が必要かチェック
const allBtns = await page.locator('button:visible').allTextContents();
console.log('現在のボタン:', allBtns.filter(b => b.trim()));

// オーナー認証パスワード入力があれば入力
const authInput = page.locator('input[placeholder*="パスワード"], input[type="password"]').first();
if (await authInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  await authInput.click({ clickCount: 3 });
  await authInput.pressSequentially('0306', { delay: 100 });
  const confirmBtn = page.locator('button:has-text("認証"), button:has-text("確認"), button:has-text("OK")').first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }
}

const btns2 = await page.locator('button:visible').allTextContents();
console.log('認証後ボタン:', btns2.filter(b => b.trim()));

await page.screenshot({ path: 'sim-ss5.png', fullPage: true });
console.log('スクリーンショット保存');
await browser.close();
