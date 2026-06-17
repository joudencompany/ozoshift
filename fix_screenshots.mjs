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
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button:has-text("後で")').first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(400);
    } else break;
  }
}

async function loginStaff(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(STAFF_NUM);
  await page.locator('input[type="password"]').first().fill(STAFF_PASS);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForSelector('button:has-text("スタッフ"), button:has-text("アルバイト")', { timeout: 8000 }).catch(() => {});
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
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── slide05: ロール選択画面 ──
  await loginStaff(page);
  await shot(page, 'slide05_menu_select');

  // ── slide06: スタッフメニュー一覧（通知バッジあり）──
  // スタッフボタンをクリック → メニュー表示まで確実に待つ
  const staffBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await staffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await staffBtn.click({ force: true });
  }
  // スタッフメニューが完全に表示されるまで待つ
  await page.waitForSelector('button:has-text("シフト関連")', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'slide06_notif_and_menu');  // 通知バッジが見える状態

  // ── slide07: スタッフメニュー（モーダル閉じた後）──
  await dismissModals(page);
  await page.waitForTimeout(600);
  await shot(page, 'slide07_staff_menu');

  // ── slide16: 修正申請・承認状況（打刻履歴画面）──
  // 「勤怠入力」はロール選択画面にあるボタンなので、スタッフを選ばず直接クリック
  await loginStaff(page);
  // ロール選択画面で「勤怠入力」をクリック（スタッフメニューには存在しない）
  const clockBtn = page.locator('button:has-text("勤怠入力")').first();
  if (await clockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clockBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await dismissModals(page);
    // 管理番号入力画面があれば入力
    const numInput = page.locator('input').first();
    if (await numInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numInput.fill(STAFF_NUM);
      const nextBtn = page.locator('button:has-text("次へ")').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await dismissModals(page);
      }
    }
    // 履歴ボタン → 承認状況が見える画面
    const histBtn = page.locator('button:has-text("履歴")').first();
    if (await histBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await histBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await dismissModals(page);
      await shot(page, 'slide16_approval_status');

      // 履歴レコードがあれば詳細も撮影（申請中/承認済バッジ確認）
      const record = page.locator('[style*="cursor: pointer"]').first();
      if (await record.isVisible({ timeout: 2000 }).catch(() => false)) {
        await record.click({ force: true });
        await page.waitForTimeout(1500);
        await shot(page, 'slide16b_approval_detail');
      }
    } else {
      // 履歴ボタンがなければ打刻画面を slide16 として使用
      await shot(page, 'slide16_approval_status');
    }
  } else {
    console.log('SKIP slide16: 勤怠入力ボタンが見つかりません');
  }

  // ── オーナーメニュー（再確認）──
  await loginOwner(page);
  const ownerBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  if (await ownerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ownerBtn.click({ force: true });
    await page.waitForSelector('button:has-text("シフト関連")', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, 'slide17_owner_menu_with_notif');
    await dismissModals(page);
    await page.waitForTimeout(500);
    await shot(page, 'slide17_owner_menu');
  }

  await browser.close();
  console.log('\n✅ Done');
})();
