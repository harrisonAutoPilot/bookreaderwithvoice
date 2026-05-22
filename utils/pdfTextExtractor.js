import ReactNativeBlobUtil from 'react-native-blob-util';

function hashUri(uri) {
  let h = 0;
  for (let i = 0; i < uri.length; i += 1) {
    h = (h << 5) - h + uri.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Maps bundle PDF URI to bundled text JSON (pre-extracted at build time).
 * bundle-assets://grade9/ENG.pdf -> bundle-assets://grade9/text/ENG.json
 */
export function pdfUriToTextUri(filepath) {
  const uri = filepath || '';
  if (uri.startsWith('bundle-assets://')) {
    return uri.replace(/([^/]+)\.pdf$/i, 'text/$1.json');
  }
  if (/\.pdf$/i.test(uri)) {
    return uri.replace(/([^/]+)\.pdf$/i, 'text/$1.json');
  }
  return null;
}

async function readBundledJson(textUri) {
  const hash = hashUri(textUri);
  const cacheFile = `${
    ReactNativeBlobUtil.fs.dirs.CacheDir
  }/pdf-text-json-${hash}.json`;

  if (!(await ReactNativeBlobUtil.fs.exists(cacheFile))) {
    await ReactNativeBlobUtil.fs.cp(textUri, cacheFile);
  }

  const raw = await ReactNativeBlobUtil.fs.readFile(cacheFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (
    !parsed ||
    !Array.isArray(parsed.pages) ||
    typeof parsed.totalPages !== 'number'
  ) {
    throw new Error('Invalid PDF text bundle');
  }
  return parsed;
}

/**
 * Load per-page text for a subject PDF from bundled JSON assets.
 * Run `npm run extract-pdf-text` after adding or updating PDF files.
 */
export async function loadPdfPageTexts(filepath) {
  if (!filepath) {
    throw new Error('No PDF path provided');
  }

  const textUri = pdfUriToTextUri(filepath);
  if (!textUri) {
    throw new Error('Could not resolve text bundle for this PDF');
  }

  try {
    return await readBundledJson(textUri);
  } catch (e) {
    const name = filepath.split('/').pop() || 'PDF';
    throw new Error(
      `Text for ${name} is not available. Rebuild the app after running: npm run extract-pdf-text`,
    );
  }
}
