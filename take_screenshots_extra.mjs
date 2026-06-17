import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3002';
const DIR = 'C:/Users/kouki/my-app/screenshots';

const STAFF_NUM  = '0306';
const STAFF_PASS = '236811';
const MGR_NUM    = '0000';
const MGR_PASS   = '0306';

async function shot(page, name) {
  await page.waitForTimeout(1000);
  const filePath = path.join(DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 ${name}.png`);
}

async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const laterBtn = page.locator('button:has-text("後で")').first();
    if (await laterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await laterBtn.click({ force: true });
      await page.waitForTimeout(400);
    } else break;
  }
}

async function login(page, num, pass) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(num);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);
  await dismissModals(page);
}

async function openShiftSub(page) {
  const shiftBtn = page.locator('button:has-text("シフト関連")').first();
  if (await shiftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await shiftBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── Slide 12: 就労時間確認（スタッフ）──
  await login(page, STAFF_NUM, STAFF_PASS);
  const staffBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  await staffBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await dismissModals(page);

  const workBtn = page.locator('button:has-text("就労時間確認")').first();
  if (await workBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await workBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide12_work_hours');
    console.log('slide12 done');
  } else {
    console.log('slide12: 就労時間確認 not found');
    const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
    console.log('Available buttons:', btns);
  }

  // ── Slide 14: 打刻履歴 ──
  await login(page, STAFF_NUM, STAFF_PASS);
  const staffBtn2 = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  await staffBtn2.click({ force: true });
  await page.waitForTimeout(1500);
  await dismissModals(page);

  await page.locator('button:has-text("勤怠入力")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissModals(page);

  // 管理番号入力→次へ
  const numInput = page.locator('input').first();
  if (await numInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await numInput.fill(STAFF_NUM);
    const nextBtn = page.locator('button:has-text("次へ")');
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  await dismissModals(page);

  // 履歴ボタン
  const histBtn = page.locator('button:has-text("履歴")').first();
  if (await histBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await histBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide14_clockin_history');
  } else {
    console.log('slide14: 履歴 not found - taking screenshot of current state');
    await shot(page, 'slide14_clockin_history');
  }

  // ── Slide 20/21/22: 勤怠管理（オーナー）──
  await login(page, MGR_NUM, MGR_PASS);
  const ownerBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  await ownerBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await dismissModals(page);

  const attBtn = page.locator('button:has-text("勤怠管理")').first();
  if (await attBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await attBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide20_attendance_manage');

    // 現在のページの内容確認
    const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
    console.log('Attendance page buttons:', btns);

    // タブや申請ボタン
    const applyBtn = page.locator('button:has-text("申請"), button:has-text("修正申請"), button:has-text("承認")').first();
    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await shot(page, 'slide21_correction_approve');
      await shot(page, 'slide22_correction_list');
    } else {
      // 別のタブを探す
      const tabBtns = await page.$$('button');
      console.log('No apply btn found, trying tabs...');
      await shot(page, 'slide21_correction_approve');
      await shot(page, 'slide22_correction_list');
    }
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 23: 新人登録 ──
  await dismissModals(page);
  const regBtn = page.locator('button:has-text("新人登録")').first();
  if (await regBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await regBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide23_new_staff');
  } else {
    console.log('slide23: 新人登録 not found');
    // ログインし直す
    await login(page, MGR_NUM, MGR_PASS);
    const ownerBtn2 = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
    await ownerBtn2.click({ force: true });
    await page.waitForTimeout(1500);
    await dismissModals(page);
    const regBtn2 = page.locator('button:has-text("新人登録")').first();
    if (await regBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regBtn2.click({ force: true });
      await page.waitForTimeout(2000);
      await dismissModals(page);
      await shot(page, 'slide23_new_staff');
    }
  }

  await browser.close();
  console.log('\n✅ Extra screenshots done!');
  const slideFiles = fs.readdirSync(DIR).filter(f => f.startsWith('slide'));
  console.log('All slide screenshots:', slideFiles.join(', '));
})();
