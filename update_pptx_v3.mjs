import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const PPTX_IN  = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版.pptx';
const PPTX_OUT = 'C:/Users/kouki/OneDrive/OZNONIX/オゾシフ/資料/オゾシフ使い方説明書改訂版_更新版6.pptx';
const SS_DIR   = 'C:/Users/kouki/my-app/screenshots';

const data = fs.readFileSync(PPTX_IN);
const zip = await JSZip.loadAsync(data);

// ─── ユーティリティ: Q&Aブロック（Q形+区切り形+A形 3シェイプ）を削除 ────
function removeQABlock(xml, qText) {
  const qIdx = xml.indexOf(qText);
  if (qIdx === -1) { console.log(`⚠️ removeQABlock: "${qText.substring(0,20)}" not found`); return xml; }
  const before = xml.substring(0, qIdx);
  const spStart = before.lastIndexOf('<p:sp>');
  const after = xml.substring(spStart);
  let pos = 0;
  for (let i = 0; i < 3; i++) {
    const nextEnd = after.indexOf('</p:sp>', pos);
    if (nextEnd === -1) break;
    pos = nextEnd + 7;
  }
  console.log(`✅ Removed Q&A: "${qText.substring(0,30)}"`);
  return xml.substring(0, spStart) + xml.substring(spStart + pos);
}

// ─── 1. テキスト置換（全スライドXML）────────────────────────────
const slideFiles = Object.keys(zip.files)
  .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));

let textReplaceCount = 0;
for (const slideFile of slideFiles) {
  let xml = await zip.files[slideFile].async('string');
  const before = xml;

  xml = xml
    // 役職名統一
    .replace(/アルバイト様/g, 'スタッフ様')
    .replace(/アルバイト/g, 'スタッフ')
    .replace(/店長（オーナー）様/g, 'オーナー様')
    .replace(/店長\(オーナー\)様/g, 'オーナー様')
    .replace(/店長様/g, 'オーナー様')
    .replace(/店長/g, 'オーナー様')

    // 修正申請フォームの「理由」→「備考」
    .replace(/<a:t>申請理由<\/a:t>/g, '<a:t>備考（任意）</a:t>')
    .replace(/<a:t>申請理由の書き方例<\/a:t>/g, '<a:t>備考の入力例（任意）</a:t>')
    .replace(/打ち忘れ・ミスなど理由を具体的に ★/g, '特記事項があれば記入（任意）')
    .replace(/💡 理由は具体的に書くと承認されやすいです/g, '💡 備考は任意入力です（任意）')

    // FAQ②③ 時間・時刻と理由→理由なし
    .replace(/正しい時間と理由を入力して「申請する」をタップ/g, '正しい時間を入力して「申請」ボタンをタップ')
    .replace(/正しい時間と理由を入力して/g, '正しい時間を入力して')
    .replace(/正しい時刻と理由を入力して/g, '正しい時刻を入力して')

    // FAQ① 「申請理由」3つ→2つ
    .replace(/「申請理由」の3つを入力します/g, 'の2つを入力します')
    .replace(/申請理由/g, '備考（任意）')
    .replace(/理由は「出勤打刻を忘れました」/g, '備考は省略可能です')
    .replace(/理由は具体的に書くと/g, '備考があれば記入すると')

    // FAQ① ログインできない ③ 解決しない場合（管理番号はリセット不可）
    .replace(
      /③ 解決しない場合は店長（オーナー）様に管理番号とパスワードのリセットを依頼してください/g,
      '③ 解決しない場合はオーナー様にパスワードのリセットを依頼してください。管理番号はリセットできません。'
    )
    // ↑ 上の replace が動く前に 店長→オーナー が先に走るため、
    //   「店長（オーナー）様」が既にオーナー様に変換済みの可能性あり。両パターン対応:
    .replace(
      /③ 解決しない場合はオーナー様に管理番号とパスワードのリセットを依頼してください/g,
      '③ 解決しない場合はオーナー様にパスワードのリセットを依頼してください。管理番号はリセットできません。'
    )

    // FAQ① パスワードを忘れた A（両パターン）
    .replace(
      /A  ログイン画面下の「パスワード変更」をタップして管理番号を入力し、新しいパスワードを設定してください。それでも解決しない場合は店長（オーナー）様に相談してください。/g,
      'A  パスワードを忘れた場合はまずオーナー様に相談してください。解決しない場合はオーナー様にパスワードのリセットを依頼してください。管理番号はリセットできません。'
    )
    .replace(
      /A  ログイン画面下の「パスワード変更」をタップして管理番号を入力し、新しいパスワードを設定してください。それでも解決しない場合はオーナー様に相談してください。/g,
      'A  パスワードを忘れた場合はまずオーナー様に相談してください。解決しない場合はオーナー様にパスワードのリセットを依頼してください。管理番号はリセットできません。'
    )

    // FAQ④ 承認確認の答えを更新
    .replace(
      /A  スタッフ側からは承認確認画面はありません。就労時間の画面で時間が反映されていれば承認済みです。心配な場合は直接店長（オーナー）様に確認してください。/g,
      'A  打刻履歴から申請した日をタップすると「申請中」「承認済」の状態を確認できます。就労時間に時間が反映されていれば承認済みです。確認できない場合はオーナー様に直接確認してください。'
    )
    .replace(
      /A  スタッフ側からは承認確認画面はありません。就労時間の画面で時間が反映されていれば承認済みです。心配な場合は直接オーナー様に確認してください。/g,
      'A  打刻履歴から申請した日をタップすると「申請中」「承認済」の状態を確認できます。就労時間に時間が反映されていれば承認済みです。確認できない場合はオーナー様に直接確認してください。'
    )

    // 目次スライド順序テキスト更新
    .replace(/3 通知機能/g, '3 スタッフ様メニュー一覧')
    .replace(/4 アルバイト様メニュー一覧/g, '4 通知機能')
    .replace(/4 スタッフ様メニュー一覧/g, '4 通知機能');

  // Q&Aブロック削除（テキスト置換後に実行）
  if (slideFile.includes('slide25.xml')) {
    xml = removeQABlock(xml, 'Q  シフト変更ができない・画面に入れない');
  }
  if (slideFile.includes('slide27.xml')) {
    xml = removeQABlock(xml, 'Q  勤怠入力の認証番号・パスワードを忘れた');
  }

  if (xml !== before) {
    textReplaceCount++;
    zip.file(slideFile, xml);
    console.log(`Text updated: ${slideFile}`);
  }
}
console.log(`\nText replacement: ${textReplaceCount} slides updated.\n`);

// ─── 2. スライド6と7の順序入れ替え ──────────────────────────────
let presXml = await zip.files['ppt/presentation.xml'].async('string');
const slide6Match = presXml.match(/<p:sldId[^>]+r:id="rId7"[^>]*\/>/);
const slide7Match = presXml.match(/<p:sldId[^>]+r:id="rId8"[^>]*\/>/);
if (slide6Match && slide7Match) {
  presXml = presXml
    .replace(/(<p:sldId[^>]+)r:id="rId7"([^>]*\/>)/, '$1r:id="rId_TEMP"$2')
    .replace(/(<p:sldId[^>]+)r:id="rId8"([^>]*\/>)/, '$1r:id="rId7"$2')
    .replace(/(<p:sldId[^>]+)r:id="rId_TEMP"([^>]*\/>)/, '$1r:id="rId8"$2');
  console.log('✅ Slides 6&7 swapped\n');
} else {
  console.log('⚠️ Slide swap skipped\n');
}

// ─── 3. 新スライド追加: slide11b（シフト確認 日付詳細）──────────
const detailImgPath = path.join(SS_DIR, 'slide11b_shift_detail.png');
if (fs.existsSync(detailImgPath)) {
  // slide11.xmlを読み込んでslide30.xml用に修正
  const slide11Xml = await zip.files['ppt/slides/slide11.xml'].async('string');

  // タイトル変更: "7.  シフト確認" → "7.  シフト確認 ② 日付タップで詳細確認"
  let slide30Xml = slide11Xml
    .replace(/<a:t>7\.  シフト確認<\/a:t>/g, '<a:t>7.  シフト確認 ②  日付をタップすると詳細表示</a:t>')
    // 画像のrId参照はrId1のまま（rels側で別ファイルを指定する）
    // 説明テキストを更新（既存テキストの一部を置換）
    .replace(/カレンダーで確認できる情報/g, '日付タップ後に確認できる情報')
    .replace(/● 青色：シフトあり/g, '● 名前・店舗・役割が一覧表示')
    .replace(/● 赤色：募集中/g, '● 勤務時間（開始〜終了）')
    .replace(/● 灰色：シフトなし/g, '● リスト表示とタイムライン表示を切替可能')
    .replace(/▶ 日付をタップすると、その日の/g, '▶ 「カレンダーに戻る」で')
    .replace(/詳細シフト情報が表示されます/g, 'カレンダー画面に戻れます')
    // idを変更（衝突回避）
    .replace(/id="4"/g, 'id="104"')
    .replace(/id="5"/g, 'id="105"')
    .replace(/id="6"/g, 'id="106"');

  zip.file('ppt/slides/slide30.xml', slide30Xml);

  // slide30.xml.rels（image-30-1.pngを参照）
  const slide30Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-30-1.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  zip.file('ppt/slides/_rels/slide30.xml.rels', slide30Rels);

  // image-30-1.png をメディアに追加
  const detailImgData = fs.readFileSync(detailImgPath);
  zip.file('ppt/media/image-30-1.png', detailImgData);

  // ── slide31: タイムライン表示 ──
  const timelineImgPath = path.join(SS_DIR, 'slide11c_shift_timeline.png');
  let slide31Xml = slide11Xml
    .replace(/<a:t>7\.  シフト確認<\/a:t>/g, '<a:t>7.  シフト確認 ③  タイムライン表示</a:t>')
    .replace(/カレンダーで確認できる情報/g, 'タイムライン表示で確認できる情報')
    .replace(/● 青色：シフトあり/g, '● 名前・店舗・役割を表形式で確認')
    .replace(/● 赤色：募集中/g, '● 備考欄で特記事項を確認')
    .replace(/● 灰色：シフトなし/g, '● リスト表示と切り替えて使用可能')
    .replace(/▶ 日付をタップすると、その日の/g, '▶ 「カレンダーに戻る」で')
    .replace(/詳細シフト情報が表示されます/g, 'カレンダー画面に戻れます')
    .replace(/id="4"/g, 'id="204"')
    .replace(/id="5"/g, 'id="205"')
    .replace(/id="6"/g, 'id="206"');
  zip.file('ppt/slides/slide31.xml', slide31Xml);

  const slide31Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-31-1.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  zip.file('ppt/slides/_rels/slide31.xml.rels', slide31Rels);

  if (fs.existsSync(timelineImgPath)) {
    zip.file('ppt/media/image-31-1.png', fs.readFileSync(timelineImgPath));
    console.log('✅ slide31 (タイムライン表示) image added');
  }

  // ── slide32: ホーム画面に追加（通知必須説明）──
  const addToHomeImgPath = path.join(SS_DIR, 'slide_add_to_home.png');
  const slide6Xml = await zip.files['ppt/slides/slide6.xml'].async('string');
  let slide32Xml = slide6Xml
    .replace(/<a:t>3\.  通知機能<\/a:t>/g, '<a:t>⚠️  ホーム画面への追加が必須です</a:t>')
    .replace(/通知の種類/g, 'プッシュ通知を受け取るには')
    .replace(/▶  \n🔔 シフトリマインダー　→　前日 20時にシフトをお知らせ/g, '')
    // 既存テキストを流用しつつ、重要な説明に置き換え
    .replace(/🔔 シフトリマインダー　→　前日 20時にシフトをお知らせ/g, 'ホーム画面に追加しないとプッシュ通知は届きません')
    .replace(/⏰ 1時間前通知　→　出勤1時間前にアラートが届く/g, '必ずホーム画面に追加してください')
    .replace(/⚠️ 打刻不備アラート　→　打ち忘れ・漏れを通知/g, '📱 Androidの場合')
    .replace(/📋 シフト提出期限通知　→　期限前日にリマインド/g, '① Chromeで開く　② 右上の⋮ → その他のツール → ショートカットを作成　③ ウィンドウとして開く にチェック → 作成')
    .replace(/通知のON\/OFF 切り替え/g, '📱 iPhoneの場合')
    .replace(/メニュー上部の「🔔 通知ON」ボタンをタップしてON\/OFF切り替え/g, '① Safariで開く　② 画面下の共有ボタン → ホーム画面に追加　③ 「追加」をタップ')
    .replace(/初回ログイン時に「通知を受け取りますか？」と表示される/g, '追加後、ホーム画面のアイコンからアプリを開くと通知が届くようになります')
    .replace(/id="4"/g, 'id="304"')
    .replace(/id="5"/g, 'id="305"')
    .replace(/id="6"/g, 'id="306"');
  zip.file('ppt/slides/slide32.xml', slide32Xml);

  const slide32Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-32-1.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  zip.file('ppt/slides/_rels/slide32.xml.rels', slide32Rels);

  if (fs.existsSync(addToHomeImgPath)) {
    zip.file('ppt/media/image-32-1.png', fs.readFileSync(addToHomeImgPath));
    console.log('✅ slide32 (ホーム画面追加) image added');
  }

  // ── slide33: バックグラウンド通知の設定（slide32直後）──
  let slide33Xml = slide6Xml
    .replace(/<a:t>3\.  通知機能<\/a:t>/g, '<a:t>⚙️  バックグラウンド通知の設定</a:t>')
    .replace(/通知の種類/g, 'アプリを開いていなくても通知を受け取るには')
    .replace(/🔔 シフトリマインダー　→　前日 20時にシフトをお知らせ/g, 'スマートフォンの通知設定を変更する必要があります')
    .replace(/⏰ 1時間前通知　→　出勤1時間前にアラートが届く/g, '設定しないとアプリを開いているときにしか通知が届きません')
    .replace(/⚠️ 打刻不備アラート　→　打ち忘れ・漏れを通知/g, '📱 Androidの場合')
    .replace(/📋 シフト提出期限通知　→　期限前日にリマインド/g, '設定 → アプリ → Chrome → 通知 → 「バックグラウンドで実行」を許可　／　設定 → バッテリー → バッテリー最適化 → Chrome を「最適化しない」に変更')
    .replace(/通知のON\/OFF 切り替え/g, '📱 iPhoneの場合')
    .replace(/メニュー上部の「🔔 通知ON」ボタンをタップしてON\/OFF切り替え/g, '設定 → 画面下にある追加したアプリのアイコン → 通知 → 「通知を許可」をON')
    .replace(/初回ログイン時に「通知を受け取りますか？」と表示される/g, '設定 → 一般 → バックグラウンドアプリの更新 → ONにする')
    .replace(/id="4"/g, 'id="404"')
    .replace(/id="5"/g, 'id="405"')
    .replace(/id="6"/g, 'id="406"');
  zip.file('ppt/slides/slide33.xml', slide33Xml);

  const slide33Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-33-1.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  zip.file('ppt/slides/_rels/slide33.xml.rels', slide33Rels);
  // slide33の画像はslide17_owner_menu.png（通知バッジが見えるメニュー画面）を使用
  const ownerMenuImg = path.join(SS_DIR, 'slide17_owner_menu.png');
  if (fs.existsSync(ownerMenuImg)) {
    zip.file('ppt/media/image-33-1.png', fs.readFileSync(ownerMenuImg));
    console.log('✅ slide33 (バックグラウンド通知設定) image added');
  }

  // presentation.xml.rels に rId36〜rId39 を追加
  let presRels = await zip.files['ppt/_rels/presentation.xml.rels'].async('string');
  const slideRelType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
  presRels = presRels.replace(
    '</Relationships>',
    `<Relationship Id="rId36" Type="${slideRelType}" Target="slides/slide30.xml"/><Relationship Id="rId37" Type="${slideRelType}" Target="slides/slide31.xml"/><Relationship Id="rId38" Type="${slideRelType}" Target="slides/slide32.xml"/><Relationship Id="rId39" Type="${slideRelType}" Target="slides/slide33.xml"/></Relationships>`
  );
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  // sldIdLst: slide30・31 を slide11（rId12）直後に、slide32・33 を 通知(rId7)直後に挿入
  presXml = presXml
    .replace(
      /(<p:sldId[^>]+r:id="rId12"[^>]*\/>)/,
      '$1<p:sldId id="285" r:id="rId36"/><p:sldId id="286" r:id="rId37"/>'
    )
    .replace(
      /(<p:sldId[^>]+r:id="rId7"[^>]*\/>)/,
      '$1<p:sldId id="287" r:id="rId38"/><p:sldId id="288" r:id="rId39"/>'
    );
  console.log('✅ slide32 (ホーム画面追加) + slide33 (バックグラウンド通知設定) added after 通知スライド\n');
} else {
  console.log('SKIP: slide11b_shift_detail.png not found\n');
}

zip.file('ppt/presentation.xml', presXml);

// ─── 4. 画像差し替え ─────────────────────────────────────────────
const slideImageMap = {
  1:  'slide03_login.png',
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
  if (!fs.existsSync(ssPath)) { console.log(`SKIP (no screenshot): Slide ${slideNum} → ${ssFile}`); continue; }
  const mediaPath = `ppt/media/image-${slideNum}-1.png`;
  if (!zip.files[mediaPath]) { console.log(`SKIP (no media): Slide ${slideNum} → ${mediaPath}`); continue; }
  zip.file(mediaPath, fs.readFileSync(ssPath));
  imgReplaceCount++;
  console.log(`Slide ${slideNum}: replaced ${mediaPath} ← ${ssFile}`);
}
console.log(`\nImage replacement: ${imgReplaceCount} images updated.\n`);

// ─── 5. 保存 ─────────────────────────────────────────────────────
const outData = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 }
});
fs.writeFileSync(PPTX_OUT, outData);
console.log('✅ Saved:', PPTX_OUT);
console.log('File size:', Math.round(outData.length / 1024), 'KB');
