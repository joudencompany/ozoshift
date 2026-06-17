import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:3000';
const SAVE_DIR = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

const STAFF_NUM = '0306';
const STAFF_PASS = '236811';
const MANAGER_NUM = '0000';
const MANAGER_PASS = '0306';

async function shot(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SAVE_DIR, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
}

async function closeHelp(page) {
  // × ボタンでモーダルを閉じる
  const closeBtn = page.locator('button:has-text("×")').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
}

async function openHelpAndShot(page, name) {
  const helpBtn = page.locator('button[title="使い方を見る"]').first();
  if (await helpBtn.isVisible().catch(() => false)) {
    await helpBtn.click({ force: true });
    await page.waitForTimeout(800);
    await shot(page, name);
    await closeHelp(page);
    await page.waitForTimeout(400);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── 1. ログイン画面 ──
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await shot(page, 'help_01_login');
  await openHelpAndShot(page, 'help_01_login_help');

  // ログイン（アルバイト: 0306 / 236811）
  const numInput = page.locator('input').first();
  await numInput.fill(STAFF_NUM);
  await page.waitForTimeout(300);
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(STAFF_PASS);
  await page.waitForTimeout(300);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);

  // ── 2. 役職選択画面（アルバイト） ──
  await shot(page, 'help_02_role_select');
  await openHelpAndShot(page, 'help_02_role_select_help');

  // ── 3. アルバイトメニュー ──
  const staffRoleBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await staffRoleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await staffRoleBtn.click({ force: true });
  }
  await page.waitForTimeout(2000);
  // 通知・ホーム追加プロンプトを閉じる（初回ログイン時に出る）
  for (let i = 0; i < 4; i++) {
    const laterBtn = page.locator('button:has-text("後で")').first();
    if (await laterBtn.isVisible().catch(() => false)) {
      await laterBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
  await shot(page, 'help_03_staff_menu');
  await openHelpAndShot(page, 'help_03_staff_menu_help');

  // ── 4. 新規提出（期間選択） ──
  // まずシフト関連サブメニューを開く
  await page.waitForSelector('button:has-text("シフト関連")', { timeout: 5000 }).catch(() => {});
  const shiftRelatedBtn = page.locator('button:has-text("シフト関連")').first();
  await shiftRelatedBtn.click({ force: true });
  await page.waitForTimeout(1500);
  // サブメニューのシフト提出をクリック
  await page.waitForSelector('button:has-text("シフト提出")', { timeout: 5000 }).catch(() => {});
  await page.locator('button:has-text("シフト提出")').first().click({ force: true });
  await page.waitForTimeout(1500);
  await shot(page, 'help_04_shift_period');
  await openHelpAndShot(page, 'help_04_shift_period_help');

  // 期間を選んで次へ
  try {
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const start = fmt(new Date(today.getTime() + 3*24*60*60*1000));
    const end = fmt(new Date(today.getTime() + 10*24*60*60*1000));
    await page.locator('input[type="date"]').nth(0).fill(start);
    await page.locator('input[type="date"]').nth(1).fill(end);
    await page.waitForTimeout(500);
    const nextBtn = page.locator('button:has-text("次へ")');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      // ── 5. シフト入力 ──
      await shot(page, 'help_05_shift_input');
      await openHelpAndShot(page, 'help_05_shift_input_help');
    }
  } catch(e) { console.log('shift input skip:', e.message); }

  // ── ログアウトしてリセット ──
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  // ── 6. 役職選択 → 勤怠入力 ──
  await page.locator('input').first().fill(STAFF_NUM);
  await page.locator('input[type="password"]').first().fill(STAFF_PASS);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);
  const clockinBtn = page.locator('button:has-text("勤怠入力")');
  if (await clockinBtn.isVisible().catch(() => false)) {
    await clockinBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'help_06_clockin');
  }

  // ── ログアウトして店長でログイン ──
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(MANAGER_NUM);
  await page.locator('input[type="password"]').first().fill(MANAGER_PASS);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);

  // 役職選択（店長）
  await shot(page, 'help_07_role_select_manager');
  await openHelpAndShot(page, 'help_07_role_select_manager_help');

  const mgBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  if (await mgBtn.isVisible().catch(() => false)) {
    await mgBtn.click({ force: true });
    await page.waitForTimeout(1500);
    // 店長メニュー画面
    await shot(page, 'help_08_manager_menu');
    await openHelpAndShot(page, 'help_08_manager_menu_help');
  }

  await browser.close();
  console.log('\nDone. Saved to:', SAVE_DIR);
  console.log('Files:', fs.readdirSync(SAVE_DIR).filter(f=>f.startsWith('help_')).join(', '));
})();
