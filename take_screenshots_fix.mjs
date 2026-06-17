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
  await page.waitForTimeout(800);
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

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── Slide 13/14: 勤怠入力→打刻履歴 ──
  await login(page, STAFF_NUM, STAFF_PASS);
  const staffBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  await staffBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await dismissModals(page);

  // 勤怠入力ボタン
  await page.locator('button:has-text("勤怠入力")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissModals(page);

  // 管理番号入力画面か確認
  const inputs = await page.$$('input');
  console.log('Inputs count:', inputs.length);
  const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
  console.log('Buttons:', btns);

  if (inputs.length > 0) {
    await inputs[0].fill(STAFF_NUM);
    const nextBtn = page.locator('button:has-text("次へ")');
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  await dismissModals(page);

  // 打刻画面
  const btns2 = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
  console.log('After next buttons:', btns2);
  await shot(page, 'slide13_clockin');

  // 履歴ボタン
  const histBtn = page.locator('button:has-text("履歴"), button:has-text("打刻履歴")').first();
  if (await histBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await histBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide14_clockin_history');
  } else {
    console.log('履歴ボタンが見つかりません。パスワードログインを試みます。');
    // パスワード入力がある場合
    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passInput.fill(STAFF_PASS);
      const authBtn = page.locator('button:has-text("認証"), button:has-text("ログイン"), button:has-text("次へ")').first();
      await authBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
      await dismissModals(page);
      const btns3 = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
      console.log('After auth buttons:', btns3);
      await shot(page, 'slide13_clockin');
      const histBtn2 = page.locator('button:has-text("履歴"), button:has-text("打刻履歴")').first();
      if (await histBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await histBtn2.click({ force: true });
        await page.waitForTimeout(2000);
        await shot(page, 'slide14_clockin_history');
      }
    }
  }

  // ── Slide 21/22: 修正申請承認 ── (申請ボタンをクリックした状態で詳細を撮影)
  await login(page, MGR_NUM, MGR_PASS);
  const ownerBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  await ownerBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await dismissModals(page);

  const attBtn = page.locator('button:has-text("勤怠管理")').first();
  await attBtn.click({ force: true });
  await page.waitForTimeout(2500);
  await dismissModals(page);
  await shot(page, 'slide20_attendance_manage');

  // 申請ボタン（📬申請3 など）
  const applyBtn = page.locator('button:has-text("申請")').first();
  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await applyBtn.click({ force: true });
    await page.waitForTimeout(1500);
    // 修正申請一覧モーダル
    await shot(page, 'slide22_correction_list');

    // 一覧内のアイテムをクリック（修正申請詳細）
    const listItem = page.locator('.card, [class*="card"], [class*="item"]').first();
    if (await listItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await listItem.click({ force: true });
      await page.waitForTimeout(1500);
      await shot(page, 'slide21_correction_approve');
    } else {
      // 最初のボタンや行をクリック
      const firstItem = page.locator('button, [role="button"], li').nth(2);
      if (await firstItem.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstItem.click({ force: true });
        await page.waitForTimeout(1500);
        await shot(page, 'slide21_correction_approve');
      } else {
        await shot(page, 'slide21_correction_approve');
      }
    }
  }

  await browser.close();
  console.log('\n✅ Fix screenshots done!');
})();
