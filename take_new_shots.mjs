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
  await page.waitForTimeout(1200);
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

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── ① スタッフ: シフト確認 4月8日詳細 & slide15 修正フォーム ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.locator('input').first().fill(STAFF_NUM);
    await page.locator('input[type="password"]').first().fill(STAFF_PASS);
    await page.locator('button:has-text("ログイン")').click();
    await page.waitForSelector('button:has-text("スタッフ")', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.locator('button:has-text("スタッフ")').first().click({ force: true });
    await page.waitForSelector('button:has-text("シフト関連")', { timeout: 10000 }).catch(() => {});
    await dismissModals(page);
    await page.waitForTimeout(600);

    // シフト関連 → シフト確認
    await page.locator('button:has-text("シフト関連")').first().click({ force: true });
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("シフト確認")').first().click({ force: true });
    await page.waitForTimeout(2500);
    await dismissModals(page);
    // カレンダー画面を撮影（slide11用）
    await shot(page, 'slide11_shift_confirm');

    // 4月8日をクリック（存在しない場合は8の数字をクリック）
    // まず4月のカレンダーにいるか確認、左矢印で戻る必要があれば戻る
    const cells = page.locator('td').filter({ hasText: /^8$/ });
    const cellCount = await cells.count();
    if (cellCount > 0) {
      await cells.first().click({ force: true });
      await page.waitForTimeout(2000);
      await shot(page, 'slide11b_shift_detail');
      console.log('✅ 4月8日の詳細画像を撮影');
    } else {
      // 数字の8がない場合、任意の日付をクリック
      const anyCells = page.locator('td').filter({ hasText: /^\d+$/ });
      const cnt = await anyCells.count();
      if (cnt > 5) {
        await anyCells.nth(5).click({ force: true });
        await page.waitForTimeout(2000);
        await shot(page, 'slide11b_shift_detail');
        console.log('📸 任意の日付詳細を撮影');
      }
    }

    // 戻ってスタッフメニューへ
    await page.locator('button:has-text("← 戻る"), button:has-text("戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('button:has-text("← 戻る")').first().click().catch(() => {});
    await page.waitForTimeout(800);

    // ── slide15: 勤怠入力 → 履歴 → 日付クリック → 修正モード ──
    // ロール選択に戻るため再ログイン
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.locator('input').first().fill(STAFF_NUM);
    await page.locator('input[type="password"]').first().fill(STAFF_PASS);
    await page.locator('button:has-text("ログイン")').click();
    await page.waitForSelector('button:has-text("勤怠入力")', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    // 勤怠入力クリック（ロール選択画面から）
    const clockBtn = page.locator('button:has-text("勤怠入力")').first();
    if (await clockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clockBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await dismissModals(page);
      // 管理番号入力
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
      // 履歴ボタン
      const histBtn = page.locator('button:has-text("履歴")').first();
      if (await histBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await histBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await dismissModals(page);
        // 履歴カレンダーから日付をクリック
        const cells2 = page.locator('td').filter({ hasText: /^\d+$/ });
        const cnt2 = await cells2.count();
        let clicked = false;
        // 番号の大きい日（データがある可能性が高い）から試す
        for (let i = Math.min(cnt2 - 1, 20); i >= 0 && !clicked; i--) {
          const cell = cells2.nth(i);
          const txt = await cell.textContent().catch(() => '');
          if (txt && parseInt(txt) > 0 && parseInt(txt) < 32) {
            const bg = await cell.evaluate(el => window.getComputedStyle(el).backgroundColor).catch(() => '');
            // 記録がある日は色がついている（白以外）
            if (bg && !bg.includes('255, 255, 255') && !bg.includes('transparent')) {
              await cell.click({ force: true });
              await page.waitForTimeout(2000);
              await shot(page, 'slide15_correction_view');
              console.log('✅ 勤怠履歴の日付詳細を撮影');
              // 修正モードボタン
              const editModeBtn = page.locator('button:has-text("修正モード")').first();
              if (await editModeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await editModeBtn.click({ force: true });
                await page.waitForTimeout(1500);
                await shot(page, 'slide15b_correction_form');
                console.log('✅ 修正フォームを撮影');
              } else {
                await shot(page, 'slide15b_correction_form');
              }
              clicked = true;
            }
          }
        }
        if (!clicked) {
          // 色に関係なく最初の有効な日付をクリック
          for (let i = 5; i < Math.min(cnt2, 25) && !clicked; i++) {
            const cell = cells2.nth(i);
            await cell.click({ force: true });
            await page.waitForTimeout(1500);
            const h2 = await page.locator('h2').first().textContent().catch(() => '');
            if (h2 && !h2.includes('履歴')) {
              await shot(page, 'slide15_correction_view');
              const editBtn = page.locator('button:has-text("修正モード")').first();
              if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await editBtn.click({ force: true });
                await page.waitForTimeout(1500);
                await shot(page, 'slide15b_correction_form');
                console.log('✅ 修正フォームを撮影（代替）');
              }
              clicked = true;
            }
          }
          if (!clicked) console.log('SKIP slide15: 勤怠データなし');
        }
      }
    }
    await ctx.close();
  }

  // ── ② オーナー: 通知モーダル表示状態（新しいコンテキストで） ──
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page2 = await ctx2.newPage();

    await page2.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page2.waitForTimeout(1500);
    await page2.locator('input').first().fill(MGR_NUM);
    await page2.locator('input[type="password"]').first().fill(MGR_PASS);
    await page2.locator('button:has-text("ログイン")').click();
    await page2.waitForSelector('button:has-text("オーナー"), button:has-text("店長")', { timeout: 8000 }).catch(() => {});
    await page2.waitForTimeout(600);

    const ownerBtn = page2.locator('button:has-text("オーナー"), button:has-text("店長")').first();
    if (await ownerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ownerBtn.click({ force: true });
      // オーナーメニューが表示されるまで待ち、通知モーダルが出る前に撮影
      await page2.waitForSelector('button:has-text("シフト関連")', { timeout: 12000 }).catch(() => {});
      await page2.waitForTimeout(2000); // もう少し長く待つ
      await shot(page2, 'slide17_owner_menu_with_notif');
      await dismissModals(page2);
      await page2.waitForTimeout(600);
      await shot(page2, 'slide17_owner_menu');
    }
    await ctx2.close();
  }

  // ── ③ スタッフ: 通知モーダル（新しいコンテキストで再撮影） ──
  {
    const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page3 = await ctx3.newPage();

    await page3.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page3.waitForTimeout(1500);
    await page3.locator('input').first().fill(STAFF_NUM);
    await page3.locator('input[type="password"]').first().fill(STAFF_PASS);
    await page3.locator('button:has-text("ログイン")').click();
    await page3.waitForSelector('button:has-text("スタッフ")', { timeout: 8000 }).catch(() => {});
    await page3.waitForTimeout(600);

    const staffBtn = page3.locator('button:has-text("スタッフ")').first();
    if (await staffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await staffBtn.click({ force: true });
      await page3.waitForSelector('button:has-text("シフト関連")', { timeout: 12000 }).catch(() => {});
      await page3.waitForTimeout(2000); // 長めに待つ → 通知モーダルが表示される
      await shot(page3, 'slide06_notif_and_menu');
      await dismissModals(page3);
      await page3.waitForTimeout(600);
      await shot(page3, 'slide07_staff_menu');
    }
    await ctx3.close();
  }

  await browser.close();
  console.log('\n✅ 全スクリーンショット完了');
})();
