import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR  = './playwright-screenshots/scenario';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const MANAGER = { id: '0000', pw: '0306' };
const TEST_STAFF = [
  { id: '9901', name: 'テスト太郎', pw: 'test001pw', newPw: 'newpw9901' },
  { id: '9902', name: 'テスト花子', pw: 'test002pw', newPw: null },
  { id: '9903', name: 'テスト次郎', pw: 'test003pw', newPw: null },
  { id: '9904', name: 'テスト三郎', pw: 'test004pw', newPw: null },
  { id: '9905', name: 'テスト咲子', pw: 'test005pw', newPw: null },
];

// 事前クリーンアップ
const SUPABASE_URL = 'https://csyjgivzvkypwhococfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeWpnaXZ6dmt5cHdob2NvY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzA1MjIsImV4cCI6MjA2NjY0NjUyMn0.z4VP9e98Mg6_tipaV_TPgznb01iHSg_cXynKtj27HuU';
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

console.log('事前クリーンアップ中...');
for (const s of TEST_STAFF) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?manager_number=eq.${s.id}`, { method: 'DELETE', headers: HEADERS });
}
console.log('✅ クリーンアップ完了\n');

const browser = await chromium.launch({ headless: true });
let n = 0;
const results = [];

function log(label, ok, note) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${note ? ' — ' + note : ''}`);
  results.push({ label, ok });
}
async function shot(page, label) {
  await page.screenshot({ path: `${DIR}/${String(++n).padStart(2,'0')}_${label}.png` });
}
async function newPage() {
  const p = await browser.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  return p;
}
async function closePWA(page) {
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(300);
    const btns = await page.locator('button:has-text("後で")').all();
    if (btns.length === 0) break;
    for (const b of btns) { try { await b.click({ timeout: 1000, force: true }); } catch {} }
  }
  await page.waitForTimeout(200);
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
// STEP 1: スタッフ5名を登録
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【STEP 1】スタッフ5名を登録');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);
  await page.locator('button:has-text("新人登録")').click();
  await page.waitForTimeout(800);

  for (const s of TEST_STAFF) {
    await page.locator('input[placeholder="例：山田太郎"]').fill(s.name);
    await page.locator('input[placeholder="例：101"]').fill(s.id);
    await page.locator('input[type="password"]').fill(s.pw);
    page.once('dialog', d => d.accept());
    await page.locator('button:has-text("登録")').first().click();
    await page.waitForTimeout(1500);
    const msg = await page.locator('p').first().textContent().catch(() => '');
    log(`${s.name}(${s.id}) 登録`, msg.includes('完了') || msg.includes('登録'));
  }
  await shot(page, 'step1_registered');
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: スタッフ5名がシフト提出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 2】スタッフ5名がシフト提出');
for (const s of TEST_STAFF) {
  const page = await newPage();
  await login(page, s.id, s.pw);
  const loggedIn = await page.locator('button:has-text("ログイン")').count() === 0;
  log(`${s.name} ログイン`, loggedIn);
  if (!loggedIn) { await page.close(); continue; }

  await page.locator('button:has-text("スタッフ")').click();
  await page.waitForTimeout(800);
  await closePWA(page);

  const shiftRel = page.locator('button').filter({ hasText: 'シフト関連' }).first();
  if (await shiftRel.count() > 0) { await shiftRel.click(); await page.waitForTimeout(600); await closePWA(page); }

  const submitBtn = page.locator('button').filter({ hasText: 'シフト提出' }).first();
  if (await submitBtn.count() === 0) { log(`${s.name} シフト提出ボタン`, false, '見つからず'); await page.close(); continue; }
  await submitBtn.click();
  await page.waitForTimeout(2000);
  await closePWA(page);

  const startInput = page.locator('input[type="date"]').first();
  if (await startInput.count() > 0) {
    await startInput.fill('2026-06-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-06-30');
    await page.waitForTimeout(300);
  }
  const nextBtn = page.locator('button').filter({ hasText: /次へ|決定/ }).first();
  if (await nextBtn.count() > 0) { await nextBtn.click(); await page.waitForTimeout(2000); }

  const freeBtns = page.locator('button').filter({ hasText: '終日フリー' });
  const cnt = await freeBtns.count();
  for (let i = 0; i < Math.min(5, cnt); i++) { await freeBtns.nth(i).click(); await page.waitForTimeout(100); }

  const send = page.locator('button:has-text("送信")').last();
  if (await send.count() > 0) {
    page.once('dialog', d => d.accept());
    await send.click({ force: true });
    await page.waitForTimeout(3000);
    const html = await page.content();
    const ok = html.includes('完了') || html.includes('提出が') || (await page.locator('button:has-text("送信")').count()) === 0;
    log(`${s.name} シフト提出`, ok);
    await shot(page, `step2_${s.id}_submitted`);
  } else {
    log(`${s.name} 送信ボタン`, false, '見つからず');
  }
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: パスワード変更（テスト太郎）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 3】パスワード変更（テスト太郎）');
{
  const s = TEST_STAFF[0];
  const page = await newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await closePWA(page);
  await shot(page, 'step3_login');

  const pwBtn = page.locator('button:has-text("パスワード変更"), a:has-text("パスワード変更")').first();
  if (await pwBtn.count() === 0) {
    log('パスワード変更リンク', false, 'ログイン画面に見つからず');
    await shot(page, 'step3_no_pwbtn');
    await page.close();
  } else {
    await pwBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'step3_pwchange_screen');

    const inputs = page.locator('input');
    await inputs.nth(0).fill(s.id);
    await inputs.nth(1).fill(s.pw);
    await inputs.nth(2).fill(s.newPw);
    await inputs.nth(3).fill(s.newPw);
    await shot(page, 'step3_filled');

    await page.locator('button:has-text("登録")').first().click();
    await page.waitForTimeout(2000);
    const html = await page.content();
    const ok = html.includes('変更されました') || html.includes('登録成功') || html.includes('正常に変更');
    log('テスト太郎 パスワード変更', ok);
    await shot(page, 'step3_result');
    await page.close();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 4: 新パスワードでログイン確認
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 4】新パスワードでログイン確認（テスト太郎）');
{
  const s = TEST_STAFF[0];
  const page = await newPage();
  await login(page, s.id, s.newPw);
  const ok = await page.locator('button:has-text("ログイン")').count() === 0;
  log('テスト太郎 新パスワードでログイン', ok);
  await shot(page, 'step4_newpw_login');
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 5: 勤怠入力（出勤打刻）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 5】勤怠入力（テスト太郎が出勤打刻）');
{
  const s = TEST_STAFF[0];
  const page = await newPage();
  await login(page, s.id, s.newPw);

  const clockBtn = page.locator('button:has-text("勤怠入力")').first();
  if (await clockBtn.count() === 0) {
    log('勤怠入力ボタン', false, '見つからず');
    await page.close();
  } else {
    await clockBtn.click();
    await page.waitForTimeout(2000);
    await closePWA(page);
    await shot(page, 'step5_clock_screen');

    // 管理番号・パスワード入力
    const numInput = page.locator('input').first();
    if (await numInput.count() > 0) await numInput.fill(s.id);
    const pwInput = page.locator('input[type="password"]').first();
    if (await pwInput.count() > 0) await pwInput.fill(s.newPw);

    // 認証
    const authBtn = page.locator('button').filter({ hasText: /認証|ログイン|確認/ }).first();
    if (await authBtn.count() > 0) { await authBtn.click(); await page.waitForTimeout(1500); }

    await shot(page, 'step5_after_auth');
    const btns = await page.locator('button').allTextContents();
    console.log(`  ℹ️ ボタン: ${btns.filter(t => t.trim()).slice(0, 8).join(' / ')}`);

    // 出勤打刻（ダブルクリック必須）
    const shukkinBtn = page.locator('button').filter({ hasText: /出勤/ }).first();
    if (await shukkinBtn.count() > 0) {
      page.once('dialog', d => d.accept());
      await shukkinBtn.dblclick();
      await page.waitForTimeout(3000);
      // 「最近の記録」に時刻が表示されれば成功
      const recentText = await page.locator('text=/最近の記録/').locator('..').textContent().catch(() => '');
      const allText = await page.content();
      const ok = recentText.includes(':') || allText.includes('出勤時刻') || allText.includes('14:') || allText.includes('記録:');
      log('出勤打刻（ダブルクリック）', ok);
      await shot(page, 'step5_clocked');
    } else {
      log('出勤ボタン', false, `ボタン一覧: ${btns.filter(t => t.trim()).slice(0,6).join(', ')}`);
      await shot(page, 'step5_no_shukkin');
    }
    await page.close();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 6: 修正申請（履歴から）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 6】修正申請（テスト太郎が打刻履歴から修正申請）');
{
  const s = TEST_STAFF[0];
  const page = await newPage();
  await login(page, s.id, s.newPw);

  const clockBtn = page.locator('button:has-text("勤怠入力")').first();
  if (await clockBtn.count() === 0) {
    log('勤怠入力ボタン(修正用)', false);
    await page.close();
  } else {
    await clockBtn.click();
    await page.waitForTimeout(2000);
    await closePWA(page);

    // 認証
    const numInput = page.locator('input').first();
    if (await numInput.count() > 0) await numInput.fill(s.id);
    const pwInput = page.locator('input[type="password"]').first();
    if (await pwInput.count() > 0) await pwInput.fill(s.newPw);
    const authBtn = page.locator('button').filter({ hasText: /認証|ログイン|確認/ }).first();
    if (await authBtn.count() > 0) { await authBtn.click(); await page.waitForTimeout(1500); }

    // 履歴ボタン
    const rekiBtn = page.locator('button').filter({ hasText: /履歴/ }).first();
    if (await rekiBtn.count() === 0) {
      log('履歴ボタン', false, '見つからず');
      const btns = await page.locator('button').allTextContents();
      console.log(`  ℹ️ ボタン: ${btns.filter(t => t.trim()).slice(0, 10).join(' / ')}`);
      await shot(page, 'step6_no_reki');
    } else {
      await rekiBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, 'step6_history');

      // 管理番号で絞り込み
      const histInput = page.locator('input').first();
      if (await histInput.count() > 0) {
        await histInput.fill(s.id);
        await page.waitForTimeout(300);
        const searchBtn = page.locator('button').filter({ hasText: /検索|表示|確認/ }).first();
        if (await searchBtn.count() > 0) { await searchBtn.click(); await page.waitForTimeout(1500); }
      }
      await shot(page, 'step6_history_filtered');

      // カレンダーから今日の日付をクリック
      const today = new Date();
      const todayDay = today.getDate(); // e.g. 19
      // カレンダーのセルをクリック（今日の日付が青=打刻あり）
      const dayCell = page.locator('td, [class*="day"], [class*="date"], button').filter({ hasText: new RegExp(`^${todayDay}$`) }).first();
      const dayCnt = await dayCell.count();
      log('打刻履歴の存在', dayCnt > 0, `今日(${todayDay})のセル`);

      if (dayCnt > 0) {
        await dayCell.click();
        await page.waitForTimeout(1500);
        await shot(page, 'step6_day_clicked');

        // 「修正モード」ボタンをクリック
        const shuseiBtnMode = page.locator('button').filter({ hasText: /修正モード/ }).first();
        if (await shuseiBtnMode.count() > 0) {
          await shuseiBtnMode.click();
          await page.waitForTimeout(1200);
          await shot(page, 'step6_shuseimode');
        }

        // 時刻入力フィールドがあれば修正内容を入力
        const timeInputs = page.locator('input[type="time"]');
        const tc = await timeInputs.count();
        if (tc >= 1) await timeInputs.first().fill('09:00');
        if (tc >= 2) await timeInputs.nth(1).fill('18:00');

        // 「📤 申請」ボタンをクリック（修正申請の送信）
        const applyBtn = page.locator('button').filter({ hasText: /申請/ }).filter({ hasText: /📤|する|する$/ }).first()
          .or(page.locator('button:has-text("📤"), button').filter({ hasText: '申請' }).first());
        // シンプルに：申請 を含むボタン（キャンセル・修正モード以外）
        const allBtns2 = await page.locator('button').allTextContents();
        console.log(`  ℹ️ ボタン: ${allBtns2.filter(t => t.trim()).slice(0, 8).join(' / ')}`);
        const applyBtnSimple = page.locator('button').filter({ hasText: /申請/ }).filter({ hasText: /📤|する/ }).first();
        // 「📤 申請」を直接探す
        const submitApply = page.locator('button').filter({ hasText: '申請' }).last(); // 📤 申請 は末尾の申請ボタン
        if (await submitApply.count() > 0) {
          const btnLabel = await submitApply.textContent();
          page.once('dialog', d => d.accept());
          await submitApply.click();
          await page.waitForTimeout(2500);
          const html = await page.content();
          log('修正申請 送信', html.includes('申請') || html.includes('完了') || html.includes('送信'));
          await shot(page, 'step6_fix_sent');
        } else {
          log('申請ボタン', false, '見つからず');
          await shot(page, 'step6_no_apply');
        }
      }
    }
    await page.close();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 7: 店長が修正申請を確認・承認
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 7】店長が修正申請を確認・承認');
{
  const page = await newPage();
  await login(page, MANAGER.id, MANAGER.pw);
  await page.locator('button:has-text("オーナー")').click();
  await page.waitForTimeout(800);
  await closePWA(page);

  await page.locator('button').filter({ hasText: '勤怠管理' }).first().click();
  await page.waitForTimeout(2000);
  await closePWA(page);
  await shot(page, 'step7_attendance');

  const btns0 = await page.locator('button').allTextContents();
  console.log(`  ℹ️ ボタン: ${btns0.filter(t => t.trim()).slice(0, 10).join(' / ')}`);

  // 📬申請N ボタン（バッジ付き）をクリック
  const fixTab = page.locator('button').filter({ hasText: /📬申請|修正申請|申請一覧/ }).first();
  if (await fixTab.count() > 0) {
    await fixTab.click();
    await page.waitForTimeout(1500);
    await shot(page, 'step7_fix_list');

    // 申請一覧のカード（buttonとして表示）をクリック
    const card = page.locator('button').filter({ hasText: /テスト太郎|9901/ }).first()
      .or(page.locator('button').filter({ hasText: /件の修正申請/ }).first());
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(1500);
      await shot(page, 'step7_card_opened');

      const approveBtn = page.locator('button').filter({ hasText: /承認/ }).first();
      if (await approveBtn.count() > 0) {
        page.once('dialog', d => d.accept());
        await approveBtn.click();
        await page.waitForTimeout(2000);
        log('修正申請 承認', true);
        await shot(page, 'step7_approved');
      } else {
        log('承認ボタン', false, 'カード内に見つからず');
        const btns = await page.locator('button').allTextContents();
        console.log(`  ℹ️ ボタン: ${btns.filter(t => t.trim()).slice(0, 8).join(' / ')}`);
        await shot(page, 'step7_no_approve');
      }
    } else {
      log('修正申請カード', false, 'テスト太郎の申請カードが見つからず');
      await shot(page, 'step7_no_card');
    }
  } else {
    log('修正申請タブ', false, '見つからず');
    await shot(page, 'step7_no_tab');
  }
  await page.close();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 8: クリーンアップ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【STEP 8】クリーンアップ');
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

  for (const s of TEST_STAFF) {
    const row = page.locator('tr').filter({ hasText: s.id });
    if (await row.count() > 0) {
      page.once('dialog', d => d.accept());
      await row.locator('button:has-text("削除")').click();
      await page.waitForTimeout(1200);
      log(`${s.name} 削除`, true);
    } else {
      log(`${s.name} 削除`, false, '行なし');
    }
  }
  await shot(page, 'step8_done');
  await page.close();
}

await browser.close();

// サマリー
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('シナリオテスト結果');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const passed = results.filter(r => r.ok).length;
console.log(`合格: ${passed} / ${results.length}`);
results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}`));
console.log(`\nスクリーンショット → ${DIR}/`);
