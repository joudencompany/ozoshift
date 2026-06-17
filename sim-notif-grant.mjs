import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eqjqotinlcpepcitpcps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
);

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });

// 通知権限を明示的に許可
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  permissions: ['notifications'],
  // 通知権限をサイトに付与
});

await context.grantPermissions(['notifications'], { origin: 'https://ozoshift-0001.pages.dev' });

const page = await context.newPage();

page.on('console', m => {
  if (m.type() === 'error' || m.text().includes('push') || m.text().includes('通知')) {
    console.log(`[${m.type()}] ${m.text().slice(0, 150)}`);
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

// 通知ONボタンをクリック
const notifBtn = page.locator('button:has-text("通知OFF")').first();
if (await notifBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await notifBtn.click();
  await page.waitForTimeout(5000);
  console.log('✅ 通知ボタンをクリックしました');
}

// SW・Push状態確認
const swState = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  if (!regs.length) return { error: 'SW未登録' };
  const sub = await regs[0].pushManager.getSubscription();
  return { swActive: !!regs[0].active, hasSub: !!sub, endpoint: sub?.endpoint?.slice(0,60) };
});
console.log('SW状態:', JSON.stringify(swState));

// DBに保存されたか確認
await page.waitForTimeout(3000);
const { data: subs } = await supabase.from('push_subscriptions').select('manager_number, created_at');
console.log('\nDB購読情報:', subs?.length ?? 0, '件');
subs?.forEach(s => console.log(' -', s.manager_number, s.created_at));

if (subs && subs.length > 0) {
  // テスト通知を送信
  console.log('\n📲 テスト通知を送信します...');
  const resp = await fetch('https://eqjqotinlcpepcitpcps.supabase.co/functions/v1/send-push-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
    },
    body: JSON.stringify({ title: 'テスト通知', body: 'オゾシフからのテスト通知です', target_manager_numbers: null })
  });
  console.log('通知送信:', resp.ok ? '✅ HTTP ' + resp.status : '❌ HTTP ' + resp.status);
  console.log('👆 PCに通知が届いているか確認してください！');
}

console.log('\nブラウザを閉じるまで待機します...');
await page.waitForEvent('close', { timeout: 120000 }).catch(() => {});
await browser.close();
