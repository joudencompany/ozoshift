import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const DIR = 'C:/Users/kouki/my-app/screenshots';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

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

// 通知・ホーム追加モーダルを全て閉じる
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

// シフト関連サブメニューを開く（まだ開いていない場合）
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

  // ── Slide 3: ログイン画面 ──
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await shot(page, 'slide03_login');

  // ── Slide 4: パスワード変更画面 ──
  await page.locator('button:has-text("パスワード変更")').click();
  await page.waitForTimeout(1000);
  await shot(page, 'slide04_password_change');
  await page.locator('button:has-text("戻る")').first().click().catch(async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });
  await page.waitForTimeout(800);

  // ── Slide 5: メニュー選択画面（スタッフログイン後） ──
  await login(page, STAFF_NUM, STAFF_PASS);
  await shot(page, 'slide05_menu_select');

  // ── Slide 6/7: スタッフメニュー（通知含む） ──
  // スタッフ or アルバイトボタンをクリック
  const staffBtn = page.locator('button:has-text("スタッフ")').first();
  const arubaBtn = page.locator('button:has-text("アルバイト")').first();
  if (await staffBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await staffBtn.click({ force: true });
  } else if (await arubaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await arubaBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await dismissModals(page);
  await shot(page, 'slide06_notif_and_menu');
  await shot(page, 'slide07_staff_menu');

  // ── Slide 8: 新規シフト提出①期間選択 ──
  await openShiftSub(page);
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("シフト提出")').first().click({ force: true, timeout: 10000 }).catch(async () => {
    // サブメニューを再度開いて試みる
    await openShiftSub(page);
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("シフト提出")').first().click({ force: true, timeout: 10000 }).catch(() => {});
  });
  await page.waitForTimeout(1500);
  await dismissModals(page);
  await shot(page, 'slide08_shift_submit_period');

  // ── Slide 9: 新規シフト提出②希望時間入力 ──
  const today = new Date();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const start = fmt(new Date(today.getTime() + 3*24*60*60*1000));
  const end   = fmt(new Date(today.getTime() + 10*24*60*60*1000));
  await page.locator('input[type="date"]').nth(0).fill(start).catch(() => {});
  await page.locator('input[type="date"]').nth(1).fill(end).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("次へ")').click().catch(() => {});
  await page.waitForTimeout(2000);
  await dismissModals(page);
  await shot(page, 'slide09_shift_submit_time');

  // ── Slide 10: シフト変更画面 ──
  await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await dismissModals(page);
  await openShiftSub(page);
  const editBtn = page.locator('button:has-text("シフト変更")').first();
  if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide10_shift_change');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 11: シフト確認カレンダー ──
  await dismissModals(page);
  await openShiftSub(page);
  const viewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await viewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide11_shift_confirm');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 12: 就労時間確認 ──
  await dismissModals(page);
  const workBtn = page.locator('button:has-text("就労時間確認")').first();
  if (await workBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await workBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide12_work_hours');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 13: 勤怠入力（打刻）画面 ──
  await dismissModals(page);
  await page.locator('button:has-text("勤怠入力")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissModals(page);
  const numInput = page.locator('input').first();
  if (await numInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await numInput.fill(STAFF_NUM);
    const nextBtn2 = page.locator('button:has-text("次へ")');
    if (await nextBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn2.click();
      await page.waitForTimeout(2000);
    }
  }
  await dismissModals(page);
  await shot(page, 'slide13_clockin');

  // ── Slide 14: 打刻履歴 ──
  const histBtn = page.locator('button:has-text("履歴")').first();
  if (await histBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await histBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide14_clockin_history');
  }

  // ── Slide 16: 承認状況確認 ──
  // スタッフメニューに戻る
  await login(page, STAFF_NUM, STAFF_PASS);
  const staffBtn2 = page.locator('button:has-text("スタッフ")').first();
  const arubaBtn2 = page.locator('button:has-text("アルバイト")').first();
  if (await staffBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await staffBtn2.click({ force: true });
  } else if (await arubaBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await arubaBtn2.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await dismissModals(page);
  // 承認状況または就労時間確認
  const approvalBtn = page.locator('button:has-text("承認状況")').first();
  if (await approvalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await approvalBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await shot(page, 'slide16_approval_status');
  } else {
    // 就労時間確認をslide16としても使用
    const workBtn2 = page.locator('button:has-text("就労時間確認")').first();
    if (await workBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await workBtn2.click({ force: true });
      await page.waitForTimeout(2000);
      await shot(page, 'slide16_approval_status');
    }
  }

  // ── オーナー/店長でログイン ──
  await login(page, MGR_NUM, MGR_PASS);
  // Slide 5相当（オーナーのメニュー選択） - role selectをslide17_menu_selectとして保存
  await shot(page, 'slide17_menu_select');

  // ── Slide 17: オーナーメニュー ──
  const ownerBtn = page.locator('button:has-text("オーナー")').first();
  const mgBtn = page.locator('button:has-text("店長")').first();
  if (await ownerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await ownerBtn.click({ force: true });
  } else if (await mgBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mgBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await dismissModals(page);
  await shot(page, 'slide17_owner_menu');

  // ── Slide 18: シフト作成 ──
  await openShiftSub(page);
  const createBtn = page.locator('button:has-text("シフト作成")').first();
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide18_shift_create');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 19: シフト確認（オーナー）──
  await dismissModals(page);
  await openShiftSub(page);
  const mgViewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await mgViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mgViewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide19_shift_confirm_owner');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 20/21/22: 勤怠管理 ──
  await dismissModals(page);
  const attBtn = page.locator('button:has-text("勤怠管理")').first();
  if (await attBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await attBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide20_attendance_manage');

    // 修正申請タブ or ボタン
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
  }

  // ── Slide 23: 新人登録 ──
  await dismissModals(page);
  const regBtn = page.locator('button:has-text("新人登録")').first();
  if (await regBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await regBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissModals(page);
    await shot(page, 'slide23_new_staff');
  }

  await browser.close();
  console.log('\n✅ 完了:', DIR);
  const newFiles = fs.readdirSync(DIR).filter(f => f.startsWith('slide'));
  console.log('New slide screenshots:', newFiles.join(', '));
})();
