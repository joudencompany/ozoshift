import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eqjqotinlcpepcitpcps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
);

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// ログイン
await page.locator('input[placeholder="管理番号"]').click({ clickCount: 3 });
await page.locator('input[placeholder="管理番号"]').pressSequentially('0000', { delay: 100 });
await page.locator('input[type="password"]').click({ clickCount: 3 });
await page.locator('input[type="password"]').pressSequentially('0306', { delay: 100 });
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);

// オーナー選択
const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
}

// 「後で」ボタンでバナーを閉じる
const laterBtn = page.locator('button:has-text("後で")').first();
if (await laterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await laterBtn.click();
  await page.waitForTimeout(1000);
  console.log('✅ バナーを閉じました');
}

// 現在のボタン確認
const btns = await page.locator('button:visible').allTextContents();
console.log('メニューボタン:', btns.filter(b => b.trim()));

console.log('\n👆 画面が表示されました。');
console.log('   「🔕 通知OFF」または通知関連ボタンを確認してください。');
console.log('   ブラウザを閉じるまで待機します。');

// Push subscription の変化を監視（30秒おきに確認）
let checkCount = 0;
const checkInterval = setInterval(async () => {
  checkCount++;
  const { data } = await supabase.from('push_subscriptions').select('manager_number, created_at');
  if (data && data.length > 0) {
    console.log(`\n✅ Push通知登録確認！ ${data.length}件の購読情報がDBに保存されました`);
    data.forEach(d => console.log(`  管理番号: ${d.manager_number}`));
  } else {
    if (checkCount % 2 === 0) console.log(`  （通知待機中... ${checkCount * 30}秒経過）`);
  }
}, 30000);

await page.waitForEvent('close', { timeout: 300000 }).catch(() => {});
clearInterval(checkInterval);

// 最終確認
const { data: finalSubs } = await supabase.from('push_subscriptions').select('manager_number, created_at');
if (finalSubs && finalSubs.length > 0) {
  console.log('\n✅ 最終確認: Push通知購読済み');
  finalSubs.forEach(d => console.log(`  管理番号: ${d.manager_number}`));
} else {
  console.log('\n❌ Push通知未登録');
}

await browser.close();
