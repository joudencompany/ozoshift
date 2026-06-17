import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleLogs = [];
page.on('console', m => {
  consoleLogs.push(`[${m.type()}] ${m.text()}`);
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

// 通知ONボタンをクリック
const notifBtn = page.locator('button:has-text("通知OFF"), button:has-text("通知ON")').first();
if (await notifBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  const btnText = await notifBtn.textContent();
  console.log('通知ボタン:', btnText);
  await notifBtn.click();
  await page.waitForTimeout(5000); // SW登録待ち
}

// Service Worker の状態確認
const swState = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'Service Worker未対応';
  const regs = await navigator.serviceWorker.getRegistrations();
  if (regs.length === 0) return 'Service Worker未登録';
  const reg = regs[0];
  const sub = await reg.pushManager.getSubscription();
  return {
    swScope: reg.scope,
    swState: reg.active?.state,
    hasPushSub: !!sub,
    endpoint: sub?.endpoint?.substring(0, 50)
  };
});
console.log('SW状態:', JSON.stringify(swState));

// 通知権限
const permission = await page.evaluate(() => Notification.permission);
console.log('通知権限:', permission);

console.log('\nコンソールログ（エラーのみ）:');
consoleLogs.filter(l => l.includes('[error]') || l.includes('406') || l.includes('push')).forEach(l => console.log(l));

await page.screenshot({ path: 'sim-sw.png' });
await browser.close();
