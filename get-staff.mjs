import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.locator('input').first().fill('0000');
await page.locator('input[type="password"]').first().fill('0306');
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);

// PWAモーダルを閉じる
const later = page.locator('button:has-text("後で")');
if (await later.count() > 0) await later.click();
await page.waitForTimeout(500);

await page.locator('button:has-text("オーナー")').click();
await page.waitForTimeout(1000);

const later2 = page.locator('button:has-text("後で")');
if (await later2.count() > 0) await later2.click();
await page.waitForTimeout(500);

await page.locator('button:has-text("新人登録")').click();
await page.waitForTimeout(1000);

await page.locator('button:has-text("番号確認")').click();
await page.waitForTimeout(2000);

const rows = await page.locator('tbody tr').all();
console.log('=== スタッフ一覧 ===');
for (const row of rows) {
  const cells = await row.locator('td').allTextContents();
  if (cells.length >= 2) console.log(`管理番号: ${cells[0]}  名前: ${cells[1]}`);
}

await browser.close();
