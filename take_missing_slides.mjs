import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const DIR = 'C:/Users/kouki/my-app/screenshots';

const STAFF_NUM = '0306', STAFF_PASS = '236811';
const MGR_NUM = '0000', MGR_PASS = '0306';

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}.png`);
}

async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const b = page.locator('button:has-text("後で")').first();
    if (await b.isVisible({ timeout: 500 }).catch(() => false)) { await b.click({ force: true }); await page.waitForTimeout(400); } else break;
  }
}

async function loginStaff(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(STAFF_NUM);
  await page.locator('input[type="password"]').first().fill(STAFF_PASS);
  await page.locator('button:has-text("ログイン")').click();
  // ロール選択見出しを待つ
  await page.waitForSelector('button:has-text("スタッフ"), button:has-text("アルバイト")', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const sb = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await sb.isVisible({ timeout: 2000 }).catch(() => false)) { await sb.click({ force: true }); }
  // スタッフメニューが表示されるまで待つ
  await page.waitForSelector('button:has-text("シフト関連")', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await dismissModals(page);
  await page.waitForTimeout(500);
}

async function loginOwner(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(MGR_NUM);
  await page.locator('input[type="password"]').first().fill(MGR_PASS);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForSelector('button:has-text("オーナー"), button:has-text("店長")', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const ob = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  if (await ob.isVisible({ timeout: 2000 }).catch(() => false)) { await ob.click({ force: true }); }
  // オーナーメニューが表示されるまで待つ
  await page.waitForSelector('button:has-text("シフト関連")', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await dismissModals(page);
  await page.waitForTimeout(500);
}

async function openShiftSub(page) {
  await page.waitForSelector('button:has-text("シフト関連")', { timeout: 5000 }).catch(() => {});
  const b = page.locator('button:has-text("シフト関連")').first();
  if (await b.isVisible({ timeout: 3000 }).catch(() => false)) { await b.click({ force: true }); await page.waitForTimeout(1200); }
}

const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = new Date();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── slide08: シフト提出（期間選択）──
  await loginStaff(page);
  await openShiftSub(page);
  await page.waitForSelector('button:has-text("シフト提出")', { timeout: 5000 }).catch(() => {});
  await page.locator('button:has-text("シフト提出")').first().click({ force: true });
  await page.waitForTimeout(2500);
  await shot(page, 'slide08_shift_submit_period');

  // ── slide09: 希望時間入力 ──
  await page.locator('input[type="date"]').nth(0).fill(fmt(new Date(today.getTime()+3*864e5))).catch(() => {});
  await page.locator('input[type="date"]').nth(1).fill(fmt(new Date(today.getTime()+10*864e5))).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("次へ")').click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'slide09_shift_submit_time');

  // ── slide10: シフト変更 ──
  await loginStaff(page);
  await openShiftSub(page);
  const editBtn = page.locator('button:has-text("シフト変更")').first();
  if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await shot(page, 'slide10_shift_change');
  } else { console.log('SKIP slide10'); }

  // ── slide11: スタッフシフト確認カレンダー ──
  await loginStaff(page);
  await openShiftSub(page);
  const viewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await viewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await shot(page, 'slide11_shift_confirm');
    // slide11b: 日付クリックして詳細
    const cells = page.locator('td').filter({ hasText: /^\d+$/ });
    const cnt = await cells.count();
    let detailCaptured = false;
    for (let i = 5; i < Math.min(cnt, 28) && !detailCaptured; i++) {
      await cells.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      const heading = page.locator('h3, h2').first();
      const txt = await heading.textContent().catch(() => '');
      if (txt && !txt.includes('シフト確認')) {
        await shot(page, 'slide11b_shift_confirm_detail');
        detailCaptured = true;
      }
    }
    if (!detailCaptured) console.log('SKIP slide11b (no data or heading not changed)');
  }

  // ── slide19: オーナーシフト確認カレンダー ──
  await loginOwner(page);
  await openShiftSub(page);
  const mgViewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await mgViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mgViewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await shot(page, 'slide19_shift_confirm_owner');
    // slide19b: 詳細・編集ビュー
    const cellsO = page.locator('td').filter({ hasText: /^\d+$/ });
    const cntO = await cellsO.count();
    let detailCapturedO = false;
    for (let i = 5; i < Math.min(cntO, 28) && !detailCapturedO; i++) {
      await cellsO.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      const changeBtn = page.locator('button:has-text("変更"), button:has-text("タイムライン"), button:has-text("リスト")').first();
      if (await changeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await shot(page, 'slide19b_shift_confirm_owner_detail');
        detailCapturedO = true;
      }
    }
    if (!detailCapturedO) console.log('SKIP slide19b (no shift data)');
  }

  await browser.close();
  console.log('\n✅ Done');
})();
