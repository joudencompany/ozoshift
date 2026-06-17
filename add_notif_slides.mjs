import fs from 'fs';
import JSZip from 'jszip';

const PPTX_IN  = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版_更新版.pptx';
const PPTX_OUT = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版_更新版.pptx';

// ── テキストラン生成ヘルパー ──
function run(text, { sz = 1700, bold = false, color = '1A1A1A', font = 'Meiryo UI' } = {}) {
  const b = bold ? ' b="1"' : '';
  return `<a:r><a:rPr lang="en-US" sz="${sz}"${b} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}" pitchFamily="34" charset="0"/><a:ea typeface="${font}" pitchFamily="34" charset="-122"/><a:cs typeface="${font}" pitchFamily="34" charset="-120"/></a:rPr><a:t>${text}</a:t></a:r>`;
}
function para(runs, { algn = '' } = {}) {
  const algnAttr = algn ? ` algn="${algn}"` : '';
  return `<a:p><a:pPr${algnAttr} indent="0" marL="0"><a:buNone/></a:pPr>${runs}</a:p>`;
}
function emptyPara() { return `<a:p><a:pPr indent="0" marL="0"><a:buNone/></a:pPr><a:endParaRPr lang="en-US" sz="1700" dirty="0"/></a:p>`; }

// ── テキストボックス生成 ──
function textBox(id, name, x, y, cx, cy, paragraphs, anchor = 'top') {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="${anchor}"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}
function filledBox(id, name, x, y, cx, cy, fillColor, borderColor = null, borderW = 12700) {
  const border = borderColor
    ? `<a:ln w="${borderW}"><a:solidFill><a:srgbClr val="${borderColor}"/></a:solidFill><a:prstDash val="solid"/></a:ln>`
    : `<a:ln/>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fillColor}"/></a:solidFill>${border}</p:spPr></p:sp>`;
}

// ── スライドXML生成 ──
function makeSlideXml(slideName, titleText, headerColor, bodyShapes) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld name="${slideName}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8F9FA"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<!-- header bar -->
<p:sp><p:nvSpPr><p:cNvPr id="2" name="HeaderBg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="749808"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${headerColor}"/></a:solidFill><a:ln/></p:spPr></p:sp>
<!-- header title -->
<p:sp><p:nvSpPr><p:cNvPr id="3" name="HeaderText"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="228600" y="0"/><a:ext cx="11887200" cy="749808"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr>
<p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="ctr"/><a:lstStyle/>
${para(run(titleText, { sz: 2900, bold: true, color: 'FFFFFF' }))}
</p:txBody></p:sp>
${bodyShapes}
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

// ── セクションヘッダ付きテキスト行を生成 ──
function sectionHeader(id, name, x, y, cx, cy, text, color) {
  return filledBox(id, name + '_bg', x, y, cx, cy, color) +
    textBox(id + 100, name + '_txt', x, y, cx, cy,
      para(run(text, { sz: 1800, bold: true, color: 'FFFFFF' })), 'ctr');
}

// ────────────────────────────────────────────────
// Android スライド
// ────────────────────────────────────────────────
const androidSlide = makeSlideXml(
  '通知設定 Android', '3-A.  通知設定 ― Android（Androidご利用の方へ）', '1B5E20',
  [
    // Left column: ホーム画面への追加方法
    filledBox(10, 'box_l', 182880, 804672, 5669280, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(11, 'sec1', 182880, 804672, 5669280, 475488, '📱 ホーム画面への追加方法（必須）', '2E7D32'),
    textBox(12, 'step_l', 273600, 1353888, 5486160, 3600000,
      [
        para(run('① Chromeブラウザで以下のURLを開く', { sz: 1550 })),
        para(run('　　https://shift-app.pages.dev', { sz: 1400, color: '1565C0', bold: true })),
        emptyPara(),
        para(run('② 右上「⋮」メニューをタップ', { sz: 1550 })),
        emptyPara(),
        para(run('③「ホーム画面に追加」をタップ', { sz: 1550 })),
        emptyPara(),
        para(run('④ アイコンが追加されたら完了 ✅', { sz: 1550 })),
        emptyPara(),
        para(run('⑤ ホーム画面のアイコンからアプリを開く', { sz: 1550 })),
        emptyPara(),
        para(run('⑥ スタッフメニュー →「通知OFF（タップでON）」', { sz: 1550 })),
        emptyPara(),
        para(run('⑦「許可」をタップして通知を有効化', { sz: 1550 })),
      ].join(''), 'top'
    ),

    // Right column: 注意事項
    filledBox(20, 'box_r', 6033312, 804672, 5942016, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(21, 'sec2', 6033312, 804672, 5942016, 475488, '⚠️ バッテリー最適化の設定（重要）', 'E65100'),
    textBox(22, 'warn', 6124032, 1353888, 5760576, 2400000,
      [
        para(run('Androidはバッテリー最適化により', { sz: 1500 })),
        para(run('プッシュ通知が遅れる場合があります。', { sz: 1500 })),
        emptyPara(),
        para(run('解消するには：', { sz: 1500, bold: true })),
        para(run('設定 → アプリ → Chrome（またはブラウザ）', { sz: 1400 })),
        para(run('→ バッテリー → 「制限なし」に変更', { sz: 1400 })),
      ].join(''), 'top'
    ),
    filledBox(23, 'box_notice', 6033312, 3840000, 5942016, 548640, 'FFF3E0', 'FF9800'),
    textBox(24, 'notice_txt', 6124032, 3858288, 5760576, 511776,
      para(run('📅 アプリを1日1回は必ず確認してください', { sz: 1550, bold: true, color: 'E65100' })),
      'ctr'
    ),
    filledBox(25, 'box_note', 6033312, 4480000, 5942016, 1000000, 'E8F5E9', '43A047'),
    textBox(26, 'note_txt', 6124032, 4498288, 5760576, 963424,
      [
        para(run('✅ iPhoneは通知が安定して届きます', { sz: 1500, color: '2E7D32' })),
        emptyPara(),
        para(run('✅ 設定後は通知がバックグラウンドでも', { sz: 1500, color: '2E7D32' })),
        para(run('　　届くようになります', { sz: 1500, color: '2E7D32' })),
      ].join(''), 'top'
    ),
  ].join('')
);

// ────────────────────────────────────────────────
// iPhone スライド
// ────────────────────────────────────────────────
const iosSlide = makeSlideXml(
  '通知設定 iPhone', '3-B.  通知設定 ― iPhone（iPhoneご利用の方へ）', '1A237E',
  [
    filledBox(10, 'box_l', 182880, 804672, 5669280, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(11, 'sec1', 182880, 804672, 5669280, 475488, '📱 ホーム画面への追加（必須）', '283593'),
    textBox(12, 'step_l', 273600, 1353888, 5486160, 3600000,
      [
        para(run('① Safariで以下のURLを開く', { sz: 1550 })),
        para(run('　　https://shift-app.pages.dev', { sz: 1400, color: '1565C0', bold: true })),
        emptyPara(),
        para(run('② 画面下部の「共有」ボタン（□↑）をタップ', { sz: 1550 })),
        emptyPara(),
        para(run('③「ホーム画面に追加」をタップ', { sz: 1550 })),
        emptyPara(),
        para(run('④「追加」をタップして完了 ✅', { sz: 1550 })),
        emptyPara(),
        para(run('⑤ ホーム画面のアイコンからアプリを開く', { sz: 1550 })),
        emptyPara(),
        para(run('⑥ スタッフメニュー →「通知OFF（タップでON）」', { sz: 1550 })),
        emptyPara(),
        para(run('⑦「許可」をタップして通知を有効化', { sz: 1550 })),
      ].join(''), 'top'
    ),

    filledBox(20, 'box_r', 6033312, 804672, 5942016, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(21, 'sec2', 6033312, 804672, 5942016, 475488, '⚠️ 重要なポイント', '1A237E'),
    textBox(22, 'warn', 6124032, 1353888, 5760576, 2000000,
      [
        para(run('⚠️ Safariのブラウザから開いただけでは', { sz: 1550, bold: true, color: 'E65100' })),
        para(run('　通知を受け取れません。', { sz: 1550, bold: true, color: 'E65100' })),
        emptyPara(),
        para(run('必ずホーム画面に追加してから', { sz: 1500 })),
        para(run('そのアイコンを使って開いてください。', { sz: 1500 })),
      ].join(''), 'top'
    ),
    filledBox(23, 'box_good', 6033312, 3500000, 5942016, 700000, 'E8F5E9', '43A047'),
    textBox(24, 'good_txt', 6124032, 3518288, 5760576, 663424,
      [
        para(run('✅ iPhoneは設定後、バックグラウンドでも', { sz: 1500, color: '2E7D32' })),
        para(run('　通知が安定して届きます', { sz: 1500, color: '2E7D32' })),
      ].join(''), 'top'
    ),
    filledBox(25, 'box_note2', 6033312, 4300000, 5942016, 700000, 'E3F2FD', '1565C0'),
    textBox(26, 'note2_txt', 6124032, 4318288, 5760576, 663424,
      [
        para(run('💡 iOS 16.4以降で対応。', { sz: 1500, color: '1565C0' })),
        para(run('　古いiOSでは通知機能が使えません。', { sz: 1500, color: '1565C0' })),
      ].join(''), 'top'
    ),
  ].join('')
);

// ────────────────────────────────────────────────
// PC スライド
// ────────────────────────────────────────────────
const pcSlide = makeSlideXml(
  '通知設定 PC', '3-C.  通知設定 ― パソコン（PCご利用の方へ）', '37474F',
  [
    filledBox(10, 'box_l', 182880, 804672, 5669280, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(11, 'sec1', 182880, 804672, 5669280, 475488, '🖥️ ブラウザからの通知設定', '455A64'),
    textBox(12, 'step_l', 273600, 1353888, 5486160, 3600000,
      [
        para(run('① Chrome または Edge で開く', { sz: 1550 })),
        para(run('　　https://shift-app.pages.dev', { sz: 1400, color: '1565C0', bold: true })),
        emptyPara(),
        para(run('② ログイン後、スタッフメニューを開く', { sz: 1550 })),
        emptyPara(),
        para(run('③「通知OFF（タップでON）」をクリック', { sz: 1550 })),
        emptyPara(),
        para(run('④「通知を許可しますか？」→「許可」をクリック', { sz: 1550 })),
        emptyPara(),
        para(run('⑤「通知ON（タップでOFF）」と表示されたら完了 ✅', { sz: 1550 })),
      ].join(''), 'top'
    ),

    filledBox(20, 'box_r', 6033312, 804672, 5942016, 5760720, 'FFFFFF', 'CCCCCC'),
    sectionHeader(21, 'sec2', 6033312, 804672, 5942016, 475488, '💻 デスクトップアプリとしてインストール', '37474F'),
    textBox(22, 'install', 6124032, 1353888, 5760576, 2000000,
      [
        para(run('【Chrome の場合】', { sz: 1550, bold: true })),
        para(run('アドレスバー右端の「💻」アイコン →「インストール」', { sz: 1400 })),
        emptyPara(),
        para(run('【Edge の場合】', { sz: 1550, bold: true })),
        para(run('「⋯」→「アプリ」→「このサイトをアプリとしてインストール」', { sz: 1400 })),
        emptyPara(),
        para(run('→ デスクトップのアイコンから起動可能になります', { sz: 1400, color: '37474F' })),
      ].join(''), 'top'
    ),
    filledBox(23, 'box_warn', 6033312, 3500000, 5942016, 1100000, 'FFF8E1', 'F57F17'),
    textBox(24, 'warn_txt', 6124032, 3518288, 5760576, 1063424,
      [
        para(run('⚠️ PCでの通知に関する注意', { sz: 1600, bold: true, color: 'E65100' })),
        para(run('・ブラウザが起動中のみ通知が届きます', { sz: 1450 })),
        para(run('・スリープ中は通知が届きません', { sz: 1450 })),
        para(run('・定期的にアプリを確認してください', { sz: 1450 })),
      ].join(''), 'top'
    ),
  ].join('')
);

// ── PPTXに3スライドを追加 ──
async function addSlides() {
  const data = fs.readFileSync(PPTX_IN);
  const zip  = await JSZip.loadAsync(data);

  // 新スライード: slide30, slide31, slide32
  const newSlides = [
    { num: 30, xml: androidSlide },
    { num: 31, xml: iosSlide },
    { num: 32, xml: pcSlide },
  ];

  for (const { num, xml } of newSlides) {
    // スライドXML追加
    zip.file(`ppt/slides/slide${num}.xml`, xml);
    // 空のrels追加（画像なし）
    zip.file(`ppt/slides/_rels/slide${num}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>\n</Relationships>`);
  }

  // presentation.xml: slide29の直後に3スライドを挿入（最終スライドの前）
  let presXml = await zip.files['ppt/presentation.xml'].async('string');
  // slide28(rId29)の後でslide29(rId30)の前に挿入
  const insertAfter = `<p:sldId id="283" r:id="rId29"/>`;
  const newSldIds =
    `<p:sldId id="283" r:id="rId29"/>` +
    `<p:sldId id="285" r:id="rId31"/>` +
    `<p:sldId id="286" r:id="rId32"/>` +
    `<p:sldId id="287" r:id="rId33"/>`;
  presXml = presXml.replace(insertAfter, newSldIds);
  zip.file('ppt/presentation.xml', presXml);

  // ppt/_rels/presentation.xml.rels: 3つのrelを追加
  let presRels = await zip.files['ppt/_rels/presentation.xml.rels'].async('string');
  const relsInsert =
    `<Relationship Id="rId31" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide30.xml"/>` +
    `<Relationship Id="rId32" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide31.xml"/>` +
    `<Relationship Id="rId33" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide32.xml"/>`;
  presRels = presRels.replace('</Relationships>', relsInsert + '</Relationships>');
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  // [Content_Types].xml: 3つの新スライドを追加
  let ct = await zip.files['[Content_Types].xml'].async('string');
  const ctInsert =
    `<Override PartName="/ppt/slides/slide30.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>` +
    `<Override PartName="/ppt/slides/slide31.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>` +
    `<Override PartName="/ppt/slides/slide32.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  ct = ct.replace('</Types>', ctInsert + '</Types>');
  zip.file('[Content_Types].xml', ct);

  // 保存
  const outData = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(PPTX_OUT, outData);
  console.log('✅ 3スライドを追加して保存しました:', PPTX_OUT);
  console.log('  slide30: Android通知設定');
  console.log('  slide31: iPhone通知設定');
  console.log('  slide32: PC通知設定');
}

addSlides().catch(console.error);
