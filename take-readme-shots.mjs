import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR = './readme-assets';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
  console.log(`📸 ${name}.png`);
}
async function closePWA(page) {
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(300);
    const btns = await page.locator('button:has-text("後で")').all();
    if (!btns.length) break;
    for (const b of btns) try { await b.click({ force: true }); } catch {}
  }
}

// モバイルサイズ（スマホ見た目）
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

// 1. ログイン画面
await page.goto(BASE, { waitUntil: 'networkidle' });
await closePWA(page);
await shot(page, '01_login');

// 2. ログイン後メニュー
await page.locator('input').first().fill('0000');
await page.locator('input[type="password"]').first().fill('0306');
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);
await closePWA(page);
await shot(page, '02_menu');

// 3. オーナーメニュー
await page.locator('button:has-text("オーナー")').click();
await page.waitForTimeout(800);
await closePWA(page);
await shot(page, '03_owner_menu');

// 4. 勤怠管理
await page.locator('button').filter({ hasText: '勤怠管理' }).first().click();
await page.waitForTimeout(1500);
await closePWA(page);
await shot(page, '04_attendance');

// 戻る
await page.locator('button:has-text("戻る")').first().click();
await page.waitForTimeout(500);

// 5. シフト関連→シフト確認
await page.locator('button').filter({ hasText: 'シフト関連' }).first().click();
await page.waitForTimeout(600);
await page.locator('button').filter({ hasText: 'シフト確認' }).first().click();
await page.waitForTimeout(1500);
await closePWA(page);
await shot(page, '05_shift_view');

await browser.close();
console.log('\n✅ スクリーンショット完了 →', DIR);
