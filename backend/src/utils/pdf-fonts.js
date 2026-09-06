/**
 * Font resolution for generated PDFs.
 *
 * PDFKit's built-in fonts (Helvetica and friends) are PDF "standard 14" fonts,
 * which are limited to single-byte WinAnsi encoding. The Indian Rupee sign is
 * U+20B9, so its glyph id gets truncated to byte 0xB9 - which WinAnsi renders as
 * a superscript one. That is why an unpatched payslip shows "172,000" instead of
 * "Rs 72,000".
 *
 * The fix is to embed a TrueType font that actually contains U+20B9. Arial and
 * friends do on Windows, DejaVu on most Linux distributions, and Arial/Helvetica
 * on macOS - but none of those can be redistributed inside this repo, so they are
 * detected at runtime. If nothing suitable is found the PDF still renders
 * correctly, falling back to the built-in font and the ASCII prefix "Rs." so the
 * document is never disfigured on a machine we did not anticipate.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const RUPEE = '\u20B9';

/** Bundled fonts win, so a team can drop a licensed font in and get identical output everywhere. */
const BUNDLED_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

const CANDIDATES = [
  // regular + bold pairs, most preferred first
  { regular: path.join(BUNDLED_DIR, 'NotoSans-Regular.ttf'), bold: path.join(BUNDLED_DIR, 'NotoSans-Bold.ttf') },
  { regular: path.join(BUNDLED_DIR, 'DejaVuSans.ttf'), bold: path.join(BUNDLED_DIR, 'DejaVuSans-Bold.ttf') },
  // Windows
  { regular: 'C:/Windows/Fonts/arial.ttf', bold: 'C:/Windows/Fonts/arialbd.ttf' },
  { regular: 'C:/Windows/Fonts/segoeui.ttf', bold: 'C:/Windows/Fonts/segoeuib.ttf' },
  { regular: 'C:/Windows/Fonts/calibri.ttf', bold: 'C:/Windows/Fonts/calibrib.ttf' },
  { regular: 'C:/Windows/Fonts/tahoma.ttf', bold: 'C:/Windows/Fonts/tahomabd.ttf' },
  // macOS
  { regular: '/Library/Fonts/Arial.ttf', bold: '/Library/Fonts/Arial Bold.ttf' },
  { regular: '/System/Library/Fonts/Supplemental/Arial.ttf', bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf' },
  // Linux
  { regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' },
  { regular: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', bold: '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf' },
];

/** True when the font file exists and actually carries a glyph for the rupee sign. */
function supportsRupee(file) {
  if (!file || !fs.existsSync(file)) return false;
  try {
    // fontkit ships with pdfkit, so this adds no new dependency.
    const fontkit = require('fontkit');
    const font = fontkit.openSync(file);
    const glyph = font.glyphForCodePoint(RUPEE.codePointAt(0));
    return Boolean(glyph && glyph.id !== 0);
  } catch (err) {
    return false;
  }
}

let resolved = null;

function resolveFonts() {
  if (resolved) return resolved;

  for (const pair of CANDIDATES) {
    if (!supportsRupee(pair.regular)) continue;
    const bold = fs.existsSync(pair.bold) ? pair.bold : pair.regular;
    resolved = { regular: pair.regular, bold, hasRupee: true };
    logger.info(`[PDF] Embedding ${path.basename(pair.regular)} - rupee sign supported.`);
    return resolved;
  }

  logger.warn('[PDF] No font with a rupee glyph found; payslips will print amounts as "Rs.".');
  resolved = { regular: null, bold: null, hasRupee: false };
  return resolved;
}

/**
 * Registers the resolved fonts on a PDFKit document and returns the names to use
 * for regular and bold text, so callers never reference Helvetica directly.
 */
function registerFonts(doc) {
  const fonts = resolveFonts();
  if (!fonts.hasRupee) {
    return { regular: 'Helvetica', bold: 'Helvetica-Bold', currency: 'Rs.' };
  }
  try {
    doc.registerFont('Body', fonts.regular);
    doc.registerFont('BodyBold', fonts.bold);
    return { regular: 'Body', bold: 'BodyBold', currency: RUPEE };
  } catch (err) {
    logger.warn(`[PDF] Could not embed font (${err.message}); falling back to Helvetica.`);
    return { regular: 'Helvetica', bold: 'Helvetica-Bold', currency: 'Rs.' };
  }
}

/**
 * Formats an amount in Indian digit grouping (1,20,000 rather than 120,000),
 * pinned to en-IN so output does not change with the server's locale.
 */
function formatAmount(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

module.exports = { registerFonts, resolveFonts, formatAmount, RUPEE };
