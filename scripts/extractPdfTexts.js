/**
 * Extracts text from bundled PDFs into JSON (run on your Mac, not on the phone).
 * Usage: node scripts/extractPdfTexts.js
 */
const fs = require('fs');
const path = require('path');
const {extractText, getDocumentProxy} = require('unpdf');

const PDF_DIR = path.join(__dirname, '../android/app/src/main/assets/grade9');
const OUT_DIR = path.join(PDF_DIR, 'text');

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function extractOne(pdfFile) {
  const base = pdfFile.replace(/\.pdf$/i, '');
  const pdfPath = path.join(PDF_DIR, pdfFile);
  const outPath = path.join(OUT_DIR, `${base}.json`);

  const buf = fs.readFileSync(pdfPath);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const {totalPages, text} = await extractText(pdf, {mergePages: false});
  const pages = (text || []).map(clean);
  fs.writeFileSync(
    outPath,
    JSON.stringify({totalPages, pages}),
    'utf8',
  );
  console.log(`  ${pdfFile} -> ${totalPages} pages`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const pdfs = fs
    .readdirSync(PDF_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Extracting ${pdfs.length} PDFs...`);
  for (const pdf of pdfs) {
    await extractOne(pdf);
  }
  console.log('Done. JSON files are in android/app/src/main/assets/grade9/text/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
