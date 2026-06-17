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
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}.png`);
}

async function dismissModals(page) {
  for (let i = 0; i < 6; i++) {
    const laterBtn = page.locator('button:has-text("後で")').first();
    if (await laterBtn.isVisible({ timeout: 600 }).catch(() => false)) {
      await laterBtn.click({ force: true });
      await page.waitForTimeout(400);
    } else break;
  }
}

// ログインしてロール選択画面が表示されるまで待つ
async function loginAndWaitRoleSelect(page, num, pass) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(num);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator('button:has-text("ログイン")').click();
  // ロール選択見出しが出るまで待つ（最大5秒）
  await page.waitForSelector('h2', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
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

  // ── Slide 3: ログイン画面 ──
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await shot(page, 'slide03_login');

  // ── Slide 4: パスワード変更画面 ──
  await page.locator('button:has-text("パスワード変更")').click().catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, 'slide04_password_change');
  await page.locator('button:has-text("戻る")').first().click().catch(async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });
  await page.waitForTimeout(800);

  // ── Slide 5: メニュー選択画面（スタッフログイン後） ──
  await loginAndWaitRoleSelect(page, STAFF_NUM, STAFF_PASS);
  await shot(page, 'slide05_menu_select');

  // ── Slide 7: スタッフメニュー（通知表示前＝通知モーダル込み） + Slide 6 ──
  // スタッフボタンをクリック
  const staffRoleBtn = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await staffRoleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await staffRoleBtn.click({ force: true });
  }
  await page.waitForTimeout(1000);
  // ※ 通知モーダルが出ている状態でslide06（通知機能説明用）を撮影
  await shot(page, 'slide06_notif_and_menu');  // ← 通知表示中のスタッフ画面
  // モーダルを閉じてからslide07（スタッフメニュー）を撮影
  await dismissModals(page);
  await page.waitForTimeout(500);
  await shot(page, 'slide07_staff_menu');      // ← 通知なし・メニュー表示

  // ── Slide 8: 新規シフト提出①期間選択 ──
  await openShiftSub(page);
  await page.locator('button:has-text("シフト提出")').first().click({ force: true, timeout: 8000 }).catch(async () => {
    await openShiftSub(page);
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("シフト提出")').first().click({ force: true, timeout: 8000 }).catch(() => {});
  });
  await page.waitForTimeout(3000);
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
  await page.waitForTimeout(2500);
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

  // ── Slide 11: シフト確認①カレンダー ──
  await dismissModals(page);
  await openShiftSub(page);
  const viewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await viewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide11_shift_confirm');

    // ── Slide 11b: シフト確認②詳細（日付タップ後）──
    // カレンダーの日付セルをクリックしてみる
    const dateCell = page.locator('td[style*="cursor"], button[style*="border-radius"]').first();
    if (await dateCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateCell.click({ force: true });
      await page.waitForTimeout(1500);
      await shot(page, 'slide11b_shift_confirm_detail');
    } else {
      // 任意の日付セルをクリック
      const cells = page.locator('td').filter({ hasText: /^\d+$/ });
      const count = await cells.count();
      if (count > 10) {
        await cells.nth(10).click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        await shot(page, 'slide11b_shift_confirm_detail');
      }
    }
    await page.locator('button:has-text("← 戻る"), button:has-text("カレンダー"), button:has-text("戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
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

  // ── Slide 13: 勤怠入力①打刻ボタン ──
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

    // ── Slide 15: 修正モード（履歴内の日付クリック後）──
    // 履歴のレコードをクリック
    const histRecord = page.locator('[style*="cursor: pointer"]').first();
    if (await histRecord.isVisible({ timeout: 2000 }).catch(() => false)) {
      await histRecord.click({ force: true });
      await page.waitForTimeout(1500);
      // 閲覧状態のスクリーンショット
      await shot(page, 'slide15_correction_view');
      // 修正モードボタンをクリック
      const editModeBtn = page.locator('button:has-text("修正モード")').first();
      if (await editModeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editModeBtn.click({ force: true });
        await page.waitForTimeout(1500);
        await shot(page, 'slide15b_correction_form');
      }
    } else {
      // レコードが見つからない場合は履歴画面を slide15 として撮影
      await shot(page, 'slide15_correction_view');
    }
  }

  // ── Slide 16: 費用・備考・承認状況（就労時間確認画面）──
  // ロールに戻る
  await loginAndWaitRoleSelect(page, STAFF_NUM, STAFF_PASS);
  const staffBtn2 = page.locator('button:has-text("スタッフ"), button:has-text("アルバイト")').first();
  if (await staffBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await staffBtn2.click({ force: true });
    await page.waitForTimeout(1500);
    await dismissModals(page);
  }
  const workBtn2 = page.locator('button:has-text("就労時間確認")').first();
  if (await workBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await workBtn2.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide16_approval_status');
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── オーナーでログイン ──
  await loginAndWaitRoleSelect(page, MGR_NUM, MGR_PASS);
  await shot(page, 'slide17_menu_select');

  // オーナーボタンをクリック
  const ownerBtn = page.locator('button:has-text("オーナー"), button:has-text("店長")').first();
  if (await ownerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await ownerBtn.click({ force: true });
    await page.waitForTimeout(1000);
    // 通知が表示されている状態でスクショ
    await shot(page, 'slide17_owner_menu_with_notif');
    await dismissModals(page);
    await page.waitForTimeout(500);
    await shot(page, 'slide17_owner_menu');
  }

  // ── Slide 18: シフト作成①期間選択 ──
  await openShiftSub(page);
  const createBtn = page.locator('button:has-text("シフト作成")').first();
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide18_shift_create');

    // ── Slide 18b: シフト作成②スタッフ一覧・時間設定テーブル ──
    // 候補ボタンまたは手動で日付を入力して次へ
    const candidateBtn = page.locator('button:has-text("候補")').first();
    const manualStart = page.locator('input[type="date"]').nth(0);
    if (await manualStart.isVisible({ timeout: 2000 }).catch(() => false)) {
      const s2 = fmt(new Date(today.getTime() + 14*24*60*60*1000));
      const e2 = fmt(new Date(today.getTime() + 20*24*60*60*1000));
      await manualStart.fill(s2).catch(() => {});
      await page.locator('input[type="date"]').nth(1).fill(e2).catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('button:has-text("次へ"), button:has-text("作成を開始")').first().click().catch(() => {});
      await page.waitForTimeout(3000);
      await dismissModals(page);
      await shot(page, 'slide18b_shift_create_table');
    } else if (await candidateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await candidateBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await shot(page, 'slide18b_shift_create_table');
    }
    await page.locator('button:has-text("← 戻る"), button:has-text("戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('button:has-text("← 戻る"), button:has-text("戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 19: シフト確認①カレンダー（オーナー）──
  await dismissModals(page);
  await openShiftSub(page);
  const mgViewBtn = page.locator('button:has-text("シフト確認")').first();
  if (await mgViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mgViewBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    await shot(page, 'slide19_shift_confirm_owner');

    // ── Slide 19b: シフト確認②詳細・編集（日付クリック後）──
    const dateCellO = page.locator('td').filter({ hasText: /^\d+$/ });
    const countO = await dateCellO.count();
    if (countO > 10) {
      await dateCellO.nth(10).click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, 'slide19b_shift_confirm_owner_detail');
    }
    await page.locator('button:has-text("← 戻る"), button:has-text("カレンダー"), button:has-text("戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ── Slide 20: 勤怠管理 ──
  await dismissModals(page);
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
  const files = fs.readdirSync(DIR).filter(f => f.startsWith('slide'));
  console.log('Slide files:', files.join(', '));
})();
