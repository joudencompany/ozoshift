import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import os from 'os';

const supabase = createClient(
  'https://eqjqotinlcpepcitpcps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
);

// 永続コンテキストを使う（Push API は incognito では動かないため必須）
const userDataDir = path.join(os.tmpdir(), 'playwright-push-test');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: ['--no-sandbox'],
  viewport: { width: 1280, height: 800 },
  permissions: ['notifications'],
});

await context.grantPermissions(['notifications'], { origin: 'https://ozoshift-0001.pages.dev' });

const page = await context.newPage();

page.on('console', m => {
  if (m.type() === 'error' || m.text().includes('push') || m.text().includes('通知') || m.text().includes('Push')) {
    console.log(`[${m.type()}] ${m.text().slice(0, 200)}`);
  }
});

await page.goto('https://ozoshift-0001.pages.dev', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// ログイン
await page.locator('input[placeholder="管理番号"]').click({ clickCount: 3 });
await page.locator('input[placeholder="管理番号"]').pressSequentially('0000', { delay: 100 });
await page.locator('input[type="password"]').click({ clickCount: 3 });
await page.locator('input[type="password"]').pressSequentially('0306', { delay: 100 });
await page.locator('button:has-text("ログイン")').click();
await page.waitForTimeout(2000);

const ownerBtn = page.locator('button:has-text("オーナー")').first();
if (await ownerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await ownerBtn.click();
  await page.waitForTimeout(2000);
}

// バナーを閉じる
const laterBtn = page.locator('button:has-text("後で")').first();
if (await laterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await laterBtn.click();
  await page.waitForTimeout(1000);
}

// 通知権限確認
const perm = await page.evaluate(() => Notification.permission);
console.log('通知権限:', perm);

// 通知ボタンをクリック
const notifBtn = page.locator('button:has-text("通知OFF"), button:has-text("通知ON"), button:has-text("通知")').first();
if (await notifBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  const btnText = await notifBtn.textContent();
  console.log('通知ボタン:', btnText);
  await notifBtn.click();
  await page.waitForTimeout(8000);
  console.log('通知ボタンをクリックしました');
} else {
  console.log('通知ボタンが見つかりません');
  const btns = await page.locator('button:visible').allTextContents();
  console.log('表示中ボタン:', btns.filter(b => b.trim()));
}

// SW・Push状態確認
const swState = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  if (!regs.length) return { error: 'SW未登録' };
  const sub = await regs[0].pushManager.getSubscription();
  return { swActive: !!regs[0].active, hasSub: !!sub, endpoint: sub?.endpoint?.slice(0, 60) };
});
console.log('SW状態:', JSON.stringify(swState));

// DBに保存されたか確認
await page.waitForTimeout(3000);
const { data: subs } = await supabase.from('push_subscriptions').select('manager_number, created_at');
console.log('\nDB購読情報:', subs?.length ?? 0, '件');
subs?.forEach(s => console.log(' -', s.manager_number, s.created_at));

if (subs && subs.length > 0) {
  console.log('\n📲 テスト通知を送信します...');
  const resp = await fetch('https://eqjqotinlcpepcitpcps.supabase.co/functions/v1/send-push-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
    },
    body: JSON.stringify({ title: 'テスト通知', body: 'オゾシフからのテスト通知です', target_manager_numbers: null })
  });
  const respText = await resp.text();
  console.log('通知送信:', resp.ok ? 'HTTP ' + resp.status : 'HTTP ' + resp.status, respText.slice(0, 100));
  console.log('PCに通知が届いているか確認してください！');
} else {
  console.log('\nDB登録なし。Push通知登録に失敗しました。');
}

console.log('\nブラウザを閉じるまで待機します...');
await page.waitForEvent('close', { timeout: 120000 }).catch(() => {});
await context.close();
