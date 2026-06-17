import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on('console', m => { if(m.type()==='error') console.log('ERR:', m.text()); });

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// input要素を確認
const inputs = await page.locator('input').all();
for (const inp of inputs) {
  const ph = await inp.getAttribute('placeholder');
  const type = await inp.getAttribute('type');
  console.log('input:', type, ph);
}

// 管理番号を入力（React対応のためtype使用）
await page.locator('input').nth(0).click();
await page.keyboard.type('0000');
await page.waitForTimeout(500);

await page.locator('input[type="password"]').click();
await page.keyboard.type('Test1234');
await page.waitForTimeout(500);

// Enterキーでログイン
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const btns = await page.locator('button:visible').allTextContents();
console.log('ログイン後ボタン:', btns);

await page.screenshot({ path: 'sim-ss4.png' });
console.log('スクリーンショット保存');
await browser.close();
