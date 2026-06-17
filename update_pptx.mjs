import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const PPTX_IN  = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版.pptx';
const PPTX_OUT = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版_更新版.pptx';
const SS_DIR   = 'C:/Users/kouki/my-app/screenshots';

const data = fs.readFileSync(PPTX_IN);
const zip = await JSZip.loadAsync(data);

// ─── 1. テキスト置換（全スライドXML）────────────────────────────
const slideFiles = Object.keys(zip.files)
  .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));

let textReplaceCount = 0;
for (const slideFile of slideFiles) {
  let xml = await zip.files[slideFile].async('string');
  const before = xml;

  // 順序重要：長い文字列から先に置換
  xml = xml
    .replace(/アルバイト様/g, 'スタッフ様')
    .replace(/アルバイト/g,   'スタッフ')
    .replace(/店長（オーナー）様/g, 'オーナー様')
    .replace(/店長\(オーナー\)様/g, 'オーナー様')
    .replace(/店長様/g, 'オーナー様')
    .replace(/店長/g,   'オーナー様');

  if (xml !== before) {
    textReplaceCount++;
    zip.file(slideFile, xml);
    console.log(`Text replaced: ${slideFile}`);
  }
}
console.log(`\nText replacement: ${textReplaceCount} slides updated.\n`);

// ─── 2. 画像差し替え ───────────────────────────────────────────
// スライド番号 → スクリーンショットファイル名のマッピング
const slideImageMap = {
  1:  'slide03_login.png',          // Slide 1 [タイトル/IMG]: ログイン前ホーム画面 → ログイン画面で代用
  3:  'slide03_login.png',
  4:  'slide04_password_change.png',
  5:  'slide05_menu_select.png',
  6:  'slide06_notif_and_menu.png',
  7:  'slide07_staff_menu.png',
  8:  'slide08_shift_submit_period.png',
  9:  'slide09_shift_submit_time.png',
  10: 'slide10_shift_change.png',
  11: 'slide11_shift_confirm.png',
  12: 'slide12_work_hours.png',
  13: 'slide13_clockin.png',
  14: 'slide14_clockin_history.png',
  16: 'slide16_approval_status.png',
  17: 'slide17_owner_menu.png',
  18: 'slide18_shift_create.png',
  19: 'slide19_shift_confirm_owner.png',
  20: 'slide20_attendance_manage.png',
  21: 'slide21_correction_approve.png',
  22: 'slide22_correction_list.png',
  23: 'slide23_new_staff.png',
};

let imgReplaceCount = 0;
for (const [slideNumStr, ssFile] of Object.entries(slideImageMap)) {
  const slideNum = parseInt(slideNumStr);
  const ssPath = path.join(SS_DIR, ssFile);

  if (!fs.existsSync(ssPath)) {
    console.log(`SKIP (no screenshot): Slide ${slideNum} → ${ssFile}`);
    continue;
  }

  // メディアパス: ppt/media/image-{N}-1.png
  const mediaPath = `ppt/media/image-${slideNum}-1.png`;

  if (!zip.files[mediaPath]) {
    console.log(`SKIP (no media in pptx): Slide ${slideNum} → ${mediaPath}`);
    continue;
  }

  const ssData = fs.readFileSync(ssPath);
  zip.file(mediaPath, ssData);
  imgReplaceCount++;
  console.log(`Slide ${slideNum}: replaced ${mediaPath} ← ${ssFile}`);
}

console.log(`\nImage replacement: ${imgReplaceCount} images updated.\n`);

// ─── 3. 保存 ──────────────────────────────────────────────────
const outData = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 }
});
fs.writeFileSync(PPTX_OUT, outData);
console.log('✅ Saved:', PPTX_OUT);
console.log('File size:', Math.round(outData.length / 1024), 'KB');
