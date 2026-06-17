import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const DIR = 'C:/Users/kouki/my-app/screenshots';

const STAFF_NUM  = '0306';
const STAFF_PASS = '236811';
const MGR_NUM    = '0000';
const MGR_PASS   = '0306';

async function shot(page, name) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false });
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
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── スタッフ: 就労時間確認 (slide12) ──
  await login(page, STAFF_NUM, STAFF_PASS);
  const staffBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await staffBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await staffBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await dismissModals(page);
    const workBtn = page.locator('button:has-text("就労時間確認")').first();
    if (await workBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await dismissModals(page);
      await shot(page, 'slide12_work_hours');
    } else {
      console.log('SKIP: 就労時間確認 not visible');
    }
  }

  // ── オーナー: 勤怠管理・新人登録 (slide20-23) ──
  await login(page, MGR_NUM, MGR_PASS);
  const ownerBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  if (await ownerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await ownerBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await dismissModals(page);

    // 勤怠管理
    const attBtn = page.locator('button:has-text("勤怠管理")').first();
    if (await attBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await dismissModals(page);
      await shot(page, 'slide20_attendance_manage');
      const applyBtn = page.locator('button:has-text("申請"), button:has-text("修正申請")').first();
      if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await applyBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await shot(page, 'slide21_correction_approve');
        await shot(page, 'slide22_correction_list');
        const closeBtn = page.locator('button:has-text("×"), button:has-text("✕"), button:has-text("閉じる")').first();
        if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await closeBtn.click({ force: true });
          await page.waitForTimeout(800);
        }
      } else {
        await shot(page, 'slide21_correction_approve');
        await shot(page, 'slide22_correction_list');
      }
      await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
      await page.waitForTimeout(800);
    } else {
      console.log('SKIP: 勤怠管理 not visible');
    }

    // 新人登録
    await dismissModals(page);
    const regBtn = page.locator('button:has-text("新人登録")').first();
    if (await regBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await dismissModals(page);
      await shot(page, 'slide23_new_staff');
    } else {
      console.log('SKIP: 新人登録 not visible');
    }
  } else {
    console.log('SKIP: オーナーボタン not visible');
  }

  await browser.close();
  console.log('\n✅ Done');
})();
