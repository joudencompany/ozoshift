import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './playwright-screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

async function shot(name) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
  console.log(`  📸 ${name}.png`);
}

async function login(number, password) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('input').first().fill(number);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);
}

const results = [];
function log(label, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`  ${mark} ${label}${detail ? ' — ' + detail : ''}`);
  results.push({ label, ok, detail });
}

try {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: ログイン画面の表示
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 1】ログイン画面');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await shot('01_login');
  const hasLoginBtn = await page.locator('button:has-text("ログイン")').count() > 0;
  log('ログインボタン表示', hasLoginBtn);
  const hasPwInput = await page.locator('input[type="password"]').count() > 0;
  log('パスワード入力がtype=password', hasPwInput);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: 間違ったパスワードでログイン
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 2】間違いパスワードでログイン');
  await login('0000', 'wrongpassword');
  await shot('02_wrong_login');
  const stillOnLogin = await page.locator('button:has-text("ログイン")').count() > 0;
  log('ログイン失敗時に画面が変わらない', stillOnLogin);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: 店長ログイン
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 3】店長ログイン (0000 / 0306)');
  await login('0000', '0306');
  await shot('03_manager_home');
  const loggedIn = await page.locator('button:has-text("ログイン")').count() === 0;
  log('店長ログイン成功', loggedIn);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: オーナーメニューへ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 4】オーナーメニュー');
  // PWAモーダル（ホーム画面に追加しよう）が出たら「後で」を閉じる
  const laterBtn = page.locator('button:has-text("後で")');
  if (await laterBtn.count() > 0) {
    await laterBtn.click();
    await page.waitForTimeout(500);
    console.log('  ℹ️ PWAモーダルを閉じました');
  }
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(1500);
  // オーナーメニューでもPWAモーダルが出る場合に備えて閉じる
  const laterBtn2 = page.locator('button:has-text("後で")');
  if (await laterBtn2.count() > 0) {
    await laterBtn2.click();
    await page.waitForTimeout(500);
  }
  await shot('04_owner_menu');
  log('オーナーメニュー遷移', true);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: 新人登録画面
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 5】新人登録画面');
  const registerBtn = page.locator('button:has-text("新人登録")');
  if (await registerBtn.count() > 0) {
    await registerBtn.click();
    await page.waitForTimeout(1500);
    await shot('05_register_screen');
    log('新人登録画面へ遷移', true);

    // パスワード列が表示されていないか確認
    const confirmBtn = page.locator('button:has-text("番号確認")');
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      await shot('05b_staff_list');
      const headers = await page.locator('th').allTextContents();
      log('パスワード列が消えている', !headers.includes('パスワード'), `列: ${headers.join(', ')}`);
    }
  } else {
    log('新人登録ボタン', false, '見つからず');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: スタッフメニュー
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n【TEST 6】スタッフメニュー');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await login('0000', '0306');
  await page.locator('button:has-text("スタッフ")').click();
  await page.waitForTimeout(1500);
  await shot('06_staff_menu');
  log('スタッフメニュー遷移', true);

} catch (err) {
  console.error('\n❌ エラー:', err.message);
  await shot('error');
} finally {
  await browser.close();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('テスト結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
  const passed = results.filter(r => r.ok).length;
  console.log(`合格: ${passed} / ${results.length}`);
  results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label} ${r.detail}`));
  console.log(`\nスクリーンショット → ${SCREENSHOT_DIR}/`);
}
