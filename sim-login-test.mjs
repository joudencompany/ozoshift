import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on('console', m => console.log('APP:', m.type(), m.text().slice(0,100)));

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// React inputに確実に入力する
const numInput = page.locator('input[placeholder="管理番号"]');
await numInput.click({ clickCount: 3 });
await numInput.pressSequentially('0000', { delay: 100 });
await page.waitForTimeout(300);

const passInput = page.locator('input[type="password"]');
await passInput.click({ clickCount: 3 });
await passInput.pressSequentially('Test1234', { delay: 100 });
await page.waitForTimeout(300);

// ログインボタンクリック
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(3000);

// エラーメッセージ確認
const errMsg = await page.locator('.error-msg, p[class*="error"]').textContent().catch(() => null);
if (errMsg) console.log('エラー:', errMsg);

const btns = await page.locator('button:visible').allTextContents();
console.log('ボタン:', btns);

await page.screenshot({ path: 'sim-login-test.png' });
console.log('スクリーンショット保存');
await browser.close();
