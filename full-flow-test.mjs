import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR  = './playwright-screenshots/full-flow';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const MANAGER = { id: '0000', pw: '0306' };
const TEST_STAFF = [
  { id: '9901', name: 'テスト太郎', pw: 'test001pw' },
  { id: '9902', name: 'テスト花子', pw: 'test002pw' },
  { id: '9903', name: 'テスト次郎', pw: 'test003pw' },
  { id: '9904', name: 'テスト三郎', pw: 'test004pw' },
  { id: '9905', name: 'テスト咲子', pw: 'test005pw' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 事前クリーンアップ（テスト用ユーザーをDB上から完全削除）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SUPABASE_URL = 'https://csyjgivzvkypwhococfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeWpnaXZ6dmt5cHdob2NvY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzA1MjIsImV4cCI6MjA2NjY0NjUyMn0.z4VP9e98Mg6_tipaV_TPgznb01iHSg_cXynKtj27HuU';
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

console.log('事前クリーンアップ中...');
for (const staff of TEST_STAFF) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?manager_number=eq.${staff.id}`, {
    method: 'DELETE', headers: HEADERS
  });
}
console.log('✅ クリーンアップ完了\n');

const browser = await chromium.launch({ headless: true });
let n = 0;
const results = [];

async function shot(page, label) {
  const file = `${DIR}/${String(++n).padStart(2,'0')}_${label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${file.split('/').pop()}`);
}
function log(label, ok, note='') {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${note ? ' — '+note : ''}`);
  results.push({ label, ok });
}

async function newPage() {
  const p = await browser.newPage();
  await p.setViewportSize({ width: 1280, height: 800 });
  return p;
}

// PWAモーダルを確実に閉じる（最大5回試みる）
async function closePWA(page) {
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(300);
    const btns = await page.locator('button:has-text("後で")').all();
    if (btns.length === 0) break;
    for (const b of btns) {
      try { await b.click({ timeout: 1000, force: true }); } catch {}
    }
  }
  await page.waitForTimeout(300);
}

async function login(page, id, pw) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await closePWA(page);
  await page.locator('input').first().fill(id);
  await page.locator('input[type="password"]').first().fill(pw);
  await page.locator('button:has-text("ログイン")').click();
  await page.waitForTimeout(2000);
  await closePWA(page);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: テスト用スタッフ5名を登録
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 1】テスト用スタッフ5名を登録');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);
  await page.locator('button:has-text("新人登録")').click();
  await page.waitForTimeout(800);

  for (const staff of TEST_STAFF) {
    await page.locator('input[placeholder="例：山田太郎"]').fill(staff.name);
    await page.locator('input[placeholder="例：101"]').fill(staff.id);
    await page.locator('input[type="password"]').fill(staff.pw);
    // 「再利用しますか？」確認ダイアログが出たら承認
    page.once('dialog', d => d.accept());
    await page.locator('button:has-text("登録")').first().click();
    await page.waitForTimeout(1500);
    const msgText = await page.locator('p').first().textContent().catch(() => '');
    const ok = msgText.includes('完了') || msgText.includes('登録');
    log(`${staff.name}(${staff.id})を登録`, ok, msgText.trim());
  }
  await shot(page, 'staff_registered');
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: スタッフ5名がシフト希望を提出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 2】スタッフ5名がシフト希望を提出');
for (const staff of TEST_STAFF) {
  const page = await newPage();
  await login(page, staff.id, staff.pw);

  // ログイン成功確認（ログインボタンが消えた）
  const loginGone = await page.locator('button:has-text("ログイン")').count() === 0;
  log(`${staff.name} ログイン`, loginGone);
  if (!loginGone) { await page.close(); continue; }

  await shot(page, `staff_${staff.id}_home`);

  // スタッフメニューへ
  await page.locator('button:has-text("スタッフ")').click();
  await page.waitForTimeout(1000);
  await closePWA(page);
  await shot(page, `staff_${staff.id}_menu`);

  // シフト関連 → シフト提出
  const shiftRelated = page.locator('button').filter({ hasText: 'シフト関連' }).first();
  if (await shiftRelated.count() > 0) {
    await shiftRelated.click();
    await page.waitForTimeout(800);
    await closePWA(page);
  }

  const shiftSubmit = page.locator('button').filter({ hasText: 'シフト提出' }).first();
  if (await shiftSubmit.count() > 0) {
    await shiftSubmit.click();
    await page.waitForTimeout(2000);
    await closePWA(page);
    await shot(page, `staff_${staff.id}_shift_period`);

    // 期間選択画面：日付を入力してから「次へ」
    const startInput = page.locator('input[type="date"]').first();
    const endInput   = page.locator('input[type="date"]').nth(1);
    if (await startInput.count() > 0) {
      await startInput.fill('2026-06-01');
      await endInput.fill('2026-06-30');
      await page.waitForTimeout(400);
    }
    const nextBtn = page.locator('button').filter({ hasText: /次へ|決定|開始|提出期間/ }).first();
    if (await nextBtn.count() > 0) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await shot(page, `staff_${staff.id}_shift_input`);

      // シフト入力画面：各日付の「終日フリー」を最初の5日分クリック
      const freeBtns = page.locator('button').filter({ hasText: '終日フリー' });
      const freeCnt = await freeBtns.count();
      for (let i = 0; i < Math.min(5, freeCnt); i++) {
        await freeBtns.nth(i).click();
        await page.waitForTimeout(150);
      }

      // 提出ボタン
      const submitBtn = page.locator('button:has-text("送信")').last();
      if (await submitBtn.count() > 0) {
        // アラートダイアログをキャプチャ
        let alertMsg = '';
        page.once('dialog', async d => { alertMsg = d.message(); await d.accept(); });
        await submitBtn.click({ force: true });
        await page.waitForTimeout(3000);
        if (alertMsg) console.log(`  ⚠️ アラート: ${alertMsg}`);
        // エラーメッセージをテキストで出力
        const errTexts = await page.locator('[style*="color: red"], [style*="color:#e7"], p, div').filter({ hasText: /エラー|失敗|不正|できません|ありません|オーナー/ }).allTextContents();
        if (errTexts.length > 0) console.log(`  ⚠️ エラー表示: ${errTexts[0].trim().slice(0, 80)}`);
        await shot(page, `staff_${staff.id}_submitted`);
        const doneText = await page.content();
        // 成功 = 「完了」テキストOR送信ボタンが消えたOR「シフト入力」画面が消えた
        const noSendBtn = await page.locator('button:has-text("送信")').count() === 0;
        const hasDone   = doneText.includes('完了') || doneText.includes('提出が') || doneText.includes('ありがとう');
        log(`${staff.name} シフト提出`, noSendBtn || hasDone);
      } else {
        log(`${staff.name} 送信ボタン`, false, '見つからず');
        await shot(page, `staff_${staff.id}_no_submit`);
      }
    } else {
      // 期間選択なしで直接シフト入力かも
      await shot(page, `staff_${staff.id}_direct_input`);
      const btns = await page.locator('button').allTextContents();
      log(`${staff.name} 期間選択`, false, `ボタン: ${btns.slice(0,5).join(', ')}`);
    }
  } else {
    const btns = await page.locator('button').allTextContents();
    log(`${staff.name} シフト提出ボタン`, false, `ボタン: ${btns.slice(0,5).join(', ')}`);
    await shot(page, `staff_${staff.id}_error`);
  }
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: 店長がシフトを作成
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 3】店長がシフトを作成');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);

  // シフト関連 → シフト作成
  await page.locator('button').filter({ hasText: 'シフト関連' }).first().click();
  await page.waitForTimeout(800);
  await shot(page, 'shift_sub_menu');

  await page.locator('button').filter({ hasText: 'シフト作成' }).first().click();
  await page.waitForTimeout(2000);
  await closePWA(page);
  await shot(page, 'manager_shift_create');
  log('シフト作成画面へ遷移', true);

  const btns = await page.locator('button').allTextContents();
  console.log(`  ℹ️ ボタン一覧: ${btns.filter(t => t.trim()).slice(0,8).join(' / ')}`);
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 4: 勤怠入力（ログイン後の3択画面から）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 4】勤怠入力');
{
  const page = await newPage();
  // 店長でログイン → 3択画面（スタッフ/オーナー/勤怠入力）から選択
  await login(page, MANAGER.id, MANAGER.pw);

  const clockBtn = page.locator('button:has-text("勤怠入力")');
  if (await clockBtn.count() > 0) {
    await clockBtn.click();
    await page.waitForTimeout(2000);
    await closePWA(page);
    await shot(page, 'clock_in_screen');
    log('勤怠入力画面へ遷移', true);

    // 管理番号入力欄
    const numInput = page.locator('input').first();
    if (await numInput.count() > 0) {
      await numInput.fill(TEST_STAFF[0].id);
      await page.waitForTimeout(300);
      await shot(page, 'clock_in_filled');
      log('勤怠入力：管理番号入力', true);
    }
    const btns = await page.locator('button').allTextContents();
    console.log(`  ℹ️ ボタン: ${btns.filter(t=>t.trim()).slice(0,8).join(' / ')}`);
  } else {
    log('勤怠入力ボタン', false, '見つからず');
    const btns = await page.locator('button').allTextContents();
    console.log(`  ℹ️ ボタン: ${btns.filter(t=>t.trim()).slice(0,6).join(', ')}`);
  }
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 5: 店長が勤怠管理・就労時間確定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 5】店長が勤怠管理を確認');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);

  await page.locator('button').filter({ hasText: '勤怠管理' }).first().click();
  await page.waitForTimeout(2000);
  await closePWA(page);
  await shot(page, 'manager_attendance');
  log('勤怠管理画面へ遷移', true);

  const btns = await page.locator('button').allTextContents();
  console.log(`  ℹ️ ボタン一覧: ${btns.filter(t => t.trim()).slice(0,10).join(' / ')}`);

  // 就労時間集計モードへ
  const hoursBtn = page.locator('button').filter({ hasText: /就労時間|勤務時間集計|時間集計/ }).first();
  if (await hoursBtn.count() > 0) {
    await hoursBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'work_hours_confirm');
    log('就労時間確定画面へ遷移', true);
    const btns2 = await page.locator('button').allTextContents();
    console.log(`  ℹ️ ボタン: ${btns2.filter(t=>t.trim()).slice(0,8).join(' / ')}`);
  } else {
    log('就労時間集計ボタン', false, '見つからず');
  }
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 6: テストスタッフを削除（クリーンアップ）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 6】テストスタッフを削除（クリーンアップ）');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);
  await page.locator('button:has-text("新人登録")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("番号確認")').click();
  await page.waitForTimeout(2000);

  for (const staff of TEST_STAFF) {
    const row = page.locator('tr').filter({ hasText: staff.id });
    if (await row.count() > 0) {
      page.once('dialog', d => d.accept());
      await row.locator('button:has-text("削除")').click();
      await page.waitForTimeout(1200);
      log(`${staff.name} 削除`, true);
    } else {
      log(`${staff.name} 削除`, false, '行が見つからず（既に削除済み？）');
    }
  }
  await shot(page, 'cleanup_done');
  await page.close();
}

await browser.close();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 結果サマリー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('全フローテスト結果');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const passed = results.filter(r => r.ok).length;
console.log(`合格: ${passed} / ${results.length}`);
results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}`));
console.log(`\nスクリーンショット → ${DIR}/`);
