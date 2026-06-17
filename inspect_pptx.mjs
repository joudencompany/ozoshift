import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const PPTX_IN = 'C:/Users/kouki/OneDrive/ドキュメント/オゾシフ/オゾシフ使い方説明書改訂版.pptx';

const data = fs.readFileSync(PPTX_IN);
const zip = await JSZip.loadAsync(data);

// スライドファイル一覧
const slideFiles = Object.keys(zip.files)
  .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
  .sort((a, b) => {
    const na = parseInt(a.match(/\d+/)[0]);
    const nb = parseInt(b.match(/\d+/)[0]);
    return na - nb;
  });

console.log('Slide count:', slideFiles.length);

// 各スライドのリレーションと画像を確認
for (const slideFile of slideFiles) {
  const slideNum = parseInt(slideFile.match(/slide(\d+)\.xml/)[1]);
  const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;

  if (!zip.files[relsFile]) {
    console.log(`Slide ${slideNum}: no rels file`);
    continue;
  }

  const relsXml = await zip.files[relsFile].async('string');

  // 画像の関係を探す
  const imgMatches = [...relsXml.matchAll(/Id="([^"]+)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]+)"/gi)];
  const imgMatches2 = [...relsXml.matchAll(/Target="([^"]*\.(?:png|jpg|jpeg|gif|bmp|PNG|JPG))"[^>]*Id="([^"]+)"/gi)];

  if (imgMatches.length > 0) {
    const images = imgMatches.map(m => ({ id: m[1], target: m[2] }));
    console.log(`Slide ${slideNum}: images=${JSON.stringify(images)}`);
  } else if (imgMatches2.length > 0) {
    const images = imgMatches2.map(m => ({ id: m[2], target: m[1] }));
    console.log(`Slide ${slideNum}: images(alt)=${JSON.stringify(images)}`);
  } else {
    // 全Relationship確認
    const allRels = [...relsXml.matchAll(/Relationship[^>]+>/gi)].map(m => m[0]);
    console.log(`Slide ${slideNum}: no images. Rels=${JSON.stringify(allRels.slice(0,3))}`);
  }
}

// メディアファイル一覧
const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));
console.log('\nMedia files:', mediaFiles.join(', '));
