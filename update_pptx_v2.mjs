import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const PPTX_IN  = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版.pptx';
const PPTX_OUT = 'C:/Users/kouki/OneDrive/OZNONIX/オゾシフ/資料/オゾシフ使い方説明書改訂版_更新版2.pptx';
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
    // 役職名の統一（旧→新）
    .replace(/アルバイト様/g, 'スタッフ様')
    .replace(/アルバイト/g, 'スタッフ')
    .replace(/店長（オーナー）様/g, 'オーナー様')
    .replace(/店長\(オーナー\)様/g, 'オーナー様')
    .replace(/店長様/g, 'オーナー様')
    .replace(/店長/g, 'オーナー様')

    // ── 修正申請フォームの「理由」→「備考」修正 ──
    // slide15 の修正申請フォーム説明
    .replace(/<a:t>申請理由<\/a:t>/g, '<a:t>備考（任意）</a:t>')
    .replace(/<a:t>申請理由の書き方例<\/a:t>/g, '<a:t>備考の入力例（任意）</a:t>')
    .replace(/打ち忘れ・ミスなど理由を具体的に ★/g, '特記事項があれば記入（任意）')
    .replace(/💡 理由は具体的に書くと承認されやすいです/g, '💡 備考は任意入力です（任意）')

    // slide25 FAQ「理由を入力して」→「備考欄があれば記入して」
    .replace(/正しい時間と理由を入力して「申請する」をタップ/g, '正しい時間を入力して「申請」ボタンをタップ')
    .replace(/正しい時間と理由を入力して/g, '正しい時間を入力して')

    // slide28 FAQ「申請理由」の説明
    .replace(/「申請理由」の3つを入力します/g, 'の2つを入力します')
    .replace(/申請理由/g, '備考（任意）')
    .replace(/理由は「出勤打刻を忘れました」/g, '備考は省略可能です')
    .replace(/理由は具体的に書くと/g, '備考があれば記入すると')

    // 目次スライド：通知とメニューの順序テキスト更新（後でスライド順序も変更）
    .replace(/3 通知機能/g, '3 スタッフ様メニュー一覧')
    .replace(/4 アルバイト様メニュー一覧/g, '4 通知機能')
    .replace(/4 スタッフ様メニュー一覧/g, '4 通知機能');

  if (xml !== before) {
    textReplaceCount++;
    zip.file(slideFile, xml);
    console.log(`Text replaced: ${slideFile}`);
  }
}
console.log(`\nText replacement: ${textReplaceCount} slides updated.\n`);

// ─── 2. スライド 6 と 7 の順序を入れ替え（メニュー→通知の順に）────
// presentation.xml の sldIdLst で rId7(slide6=通知) と rId8(slide7=スタッフメニュー) を入れ替え
let presXml = await zip.files['ppt/presentation.xml'].async('string');
// rId7とrId8が含まれる<p:sldId>要素を特定してスワップ
const slide6Match = presXml.match(/<p:sldId[^>]+r:id="rId7"[^>]*\/>/);
const slide7Match = presXml.match(/<p:sldId[^>]+r:id="rId8"[^>]*\/>/);
if (slide6Match && slide7Match) {
  // rId7→一時値, rId8→rId7, 一時値→rId8 の順で置換
  presXml = presXml
    .replace(/(<p:sldId[^>]+)r:id="rId7"([^>]*\/>)/, '$1r:id="rId_TEMP"$2')
    .replace(/(<p:sldId[^>]+)r:id="rId8"([^>]*\/>)/, '$1r:id="rId7"$2')
    .replace(/(<p:sldId[^>]+)r:id="rId_TEMP"([^>]*\/>)/, '$1r:id="rId8"$2');
  zip.file('ppt/presentation.xml', presXml);
  console.log('✅ Slides 6 and 7 swapped in presentation order (menu now before notification)\n');
} else {
  console.log('⚠️ Could not find rId7/rId8 in presentation.xml - slide swap skipped\n');
}

// ─── 3. 画像差し替え ───────────────────────────────────────────
// ※ スライド順序を入れ替えた後の画像マッピング:
//   - 新スライド6位置(slide7.xml=スタッフメニュー)のメディア: image-7-1.png
//   - 新スライド7位置(slide6.xml=通知)のメディア: image-6-1.png
// そのため画像マッピングはスワップ前と同じ番号で正しい

const slideImageMap = {
  1:  'slide03_login.png',
  3:  'slide03_login.png',
  4:  'slide04_password_change.png',
  5:  'slide05_menu_select.png',
  6:  'slide06_notif_and_menu.png',    // slide6.xml(通知)のimage-6-1.png
  7:  'slide07_staff_menu.png',        // slide7.xml(スタッフメニュー)のimage-7-1.png
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

// ─── 4. 保存 ──────────────────────────────────────────────────
const outData = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 }
});
fs.writeFileSync(PPTX_OUT, outData);
console.log('✅ Saved:', PPTX_OUT);
console.log('File size:', Math.round(outData.length / 1024), 'KB');
