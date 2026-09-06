/**
 * Static checks - no database, no running server.
 * Catches the class of bug that only shows up when a user clicks the page:
 * syntax errors, broken route wiring, and frontend/backend response-shape drift.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { section, check, warn, assert } = require('./runner');

const ROOT = path.resolve(__dirname, '..');
const BE = path.join(ROOT, 'backend', 'src');
const FE = path.join(ROOT, 'frontend', 'src');

function walk(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, ext));
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

/**
 * Endpoints whose repository returns a { data, total, page, limit, totalPages }
 * envelope. Any frontend caller must unwrap `.data` rather than treating the
 * payload as an array.
 */
const PAGINATED_ENDPOINTS = [
  '/employees',
  '/contracts',
  '/attendance',
  '/time-off/requests',
  '/time-off/allocations',
  '/users',
  '/audit',
  '/audit-logs',
];

const ARRAY_METHOD = /\.(find|map|filter|forEach|length|slice|some|every|reduce|sort)\b/;

async function run({ build = false } = {}) {
  section('STATIC / Backend module integrity');

  const beFiles = walk(BE, ['.js']);
  await check('ARCH', 'Every backend module parses and loads', async () => {
    const broken = [];
    let required = 0;
    let parsed = 0;
    for (const f of beFiles) {
      // Entry points bind a port on require, so syntax-check those instead of loading them.
      if (/\.listen\s*\(/.test(read(f))) {
        try {
          execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'ignore', 'pipe'] });
          parsed++;
        } catch (err) {
          broken.push(rel(f) + ': ' + String(err.stderr || err.message).trim().split('\n').slice(0, 2).join(' '));
        }
        continue;
      }
      try {
        delete require.cache[require.resolve(f)];
        require(f);
        required++;
      } catch (err) {
        broken.push(rel(f) + ': ' + err.message);
      }
    }
    assert(broken.length === 0, 'Modules failed to load:\n       - ' + broken.join('\n       - '));
    return required + ' modules loaded, ' + parsed + ' entry points syntax-checked';
  });

  await check('ARCH', 'Every route handler resolves to a real controller method', async () => {
    const routeFiles = beFiles.filter((f) => f.endsWith('.routes.js'));
    const missing = [];
    let handlers = 0;
    for (const f of routeFiles) {
      const src = read(f);
      const controllers = {};
      const requireRe = /const\s+(\w+)\s*=\s*require\((['"])([^'"]*controller)\2\)/g;
      let m;
      while ((m = requireRe.exec(src))) {
        try {
          controllers[m[1]] = require(path.resolve(path.dirname(f), m[3]));
        } catch (err) {
          missing.push(rel(f) + ': cannot require ' + m[3] + ' (' + err.message + ')');
        }
      }
      const callRe = /(\w+)\.(\w+)\(req,\s*res,\s*next\)/g;
      while ((m = callRe.exec(src))) {
        const ident = m[1];
        const method = m[2];
        if (!(ident in controllers)) continue;
        handlers++;
        if (typeof controllers[ident][method] !== 'function') {
          missing.push(rel(f) + ': ' + ident + '.' + method + '() is not defined on the controller');
        }
      }
    }
    assert(missing.length === 0, 'Broken route wiring:\n       - ' + missing.join('\n       - '));
    return handlers + ' handlers across ' + routeFiles.length + ' route files';
  });

  await check('ARCH', 'All API namespaces are mounted in app.js', async () => {
    const src = read(path.join(BE, 'app.js'));
    const mounted = [];
    const re = /app\.use\((['"])(\/api\/[^'"]+)\1\s*,/g;
    let m;
    while ((m = re.exec(src))) mounted.push(m[2]);
    assert(mounted.length >= 12, 'Only ' + mounted.length + ' API namespaces mounted, expected 12+');
    return mounted.length + ' namespaces';
  });

  section('STATIC / Backend <-> Frontend response contract');

  const feFiles = walk(FE, ['.jsx', '.js']);

  await check('ARCH', 'Frontend unwraps paginated envelopes correctly', async () => {
    const offenders = [];
    for (const f of feFiles) {
      const lines = read(f).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const call = lines[i].match(/(?:const|let)\s+(\w+)\s*=\s*await\s+api\.get\(\s*['"`]([^'"`]+)['"`]/);
        if (!call) continue;
        const varName = call[1];
        const endpoint = call[2].split('?')[0].replace(/\/$/, '');
        if (PAGINATED_ENDPOINTS.indexOf(endpoint) === -1) continue;

        const windowText = lines.slice(i, i + 8).join('\n');
        // Correct handling looks like res.data.data / res.data?.data / const envelope = res.data
        const usesEnvelope =
          new RegExp(varName + '\\.data\\s*\\??\\.\\s*data').test(windowText) ||
          new RegExp('(?:const|let)\\s+\\w+\\s*=\\s*' + varName + '\\.data\\s*;').test(windowText) ||
          new RegExp('Array\\.isArray\\(\\s*' + varName + '\\.data').test(windowText);
        // Broken handling looks like res.data.find(...) / res.data.map(...)
        const arrayDirect = new RegExp(varName + '\\.data' + ARRAY_METHOD.source).test(windowText);

        if (arrayDirect && !usesEnvelope) {
          offenders.push(
            rel(f) + ':' + (i + 1) + ' - GET ' + endpoint +
            ' returns {data,total,page,...} but the code treats `' + varName + '.data` as an array'
          );
        }
      }
    }
    assert(offenders.length === 0, 'Response-shape mismatches:\n       - ' + offenders.join('\n       - '));
    return PAGINATED_ENDPOINTS.length + ' paginated endpoints audited';
  });

  await check('ARCH', 'No frontend call targets an unmounted endpoint', async () => {
    const mountSrc = read(path.join(BE, 'app.js'));
    const namespaces = [];
    const re = /app\.use\((['"])\/api(\/[^'"]+)\1\s*,/g;
    let m;
    while ((m = re.exec(mountSrc))) namespaces.push(m[2]);

    const called = new Set();
    for (const f of feFiles) {
      const callRe = /api\.(?:get|post|put|patch|delete)\(\s*['"`](\/[^'"`$?]+)/g;
      let c;
      const src = read(f);
      while ((c = callRe.exec(src))) called.add(c[1]);
    }
    const unknown = [...called].filter(
      (p) => !namespaces.some((ns) => p === ns || p.indexOf(ns + '/') === 0)
    );
    assert(unknown.length === 0, 'Frontend calls unmounted paths: ' + unknown.join(', '));
    return called.size + ' distinct endpoints, all mounted';
  });

  section('STATIC / Route guards and error pages');

  await check('ARCH', 'Every route declares a minimum role', async () => {
    const app = read(path.join(FE, 'App.jsx'));
    const table = app.match(/const ROUTES = \[([\s\S]*?)\n\];/);
    assert(table, 'App.jsx has no ROUTES table - route guards cannot be audited');

    const entries = table[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{ path:'));
    assert(entries.length >= 10, 'only ' + entries.length + ' routes found, expected 10+');

    const ungarded = entries.filter((l) => !/minRole:\s*'[A-Z_]+'/.test(l));
    assert(ungarded.length === 0,
      'routes without a minRole (any signed-in user could open them):\n       - ' + ungarded.join('\n       - '));

    // A page that renders its own empty state instead of a denial is the exact
    // defect that made /users report "Total Accounts 0" to non-admins.
    const privileged = entries.filter((l) => /minRole:\s*'(HR_MANAGER|HR_PAYROLL_USER|HR_PAYROLL_MANAGER|ADMIN)'/.test(l));
    const noResource = privileged.filter((l) => !/resource:\s*'/.test(l));
    assert(noResource.length === 0,
      'restricted routes without a `resource` label for the denial screen:\n       - ' + noResource.join('\n       - '));

    return entries.length + ' routes guarded, ' + privileged.length + ' restricted';
  });

  await check('ARCH', 'Access-denied, not-found and error-boundary screens exist and are wired', async () => {
    const files = {
      'AccessDenied page': path.join(FE, 'pages', 'AccessDenied.jsx'),
      'NotFound page': path.join(FE, 'pages', 'NotFound.jsx'),
      'ErrorBoundary': path.join(FE, 'components', 'ErrorBoundary.jsx'),
    };
    const missing = Object.keys(files).filter((k) => !fs.existsSync(files[k]));
    assert(missing.length === 0, 'missing: ' + missing.join(', '));

    const app = read(path.join(FE, 'App.jsx'));
    for (const name of ['AccessDenied', 'NotFound', 'ErrorBoundary']) {
      assert(new RegExp('<' + name + '\\b').test(app), name + ' is imported but never rendered in App.jsx');
    }
    // The catch-all must render the 404 screen, not silently bounce to the dashboard.
    assert(
      !/path="\*"[\s\S]{0,120}<Navigate/.test(app),
      'the catch-all route still redirects instead of showing the 404 page'
    );
    return 'all three screens present and wired';
  });

  await check('ARCH', 'Expired sessions are handled instead of failing silently', async () => {
    const client = read(path.join(FE, 'api', 'client.js'));
    assert(/401/.test(client), 'api/client.js does not handle HTTP 401 at all');
    assert(/removeItem\(\s*['"]token['"]\s*\)/.test(client), 'a 401 does not clear the stored token');
    assert(/auth\/login/.test(client),
      'the 401 handler does not exempt the login request, so a wrong password would redirect instead of showing an error');
    return 'expired token clears the session and returns to login';
  });

  section('STATIC / Payslip PDF rendering');

  await check('B8', 'Payslip PDF can actually render its currency symbol', async () => {
    // PDF standard-14 fonts are WinAnsi (single byte). A rupee sign (U+20B9)
    // silently truncates to 0xB9 - a superscript one - so every amount prints as
    // "172,000". Guard both halves of the contract: an embedded font when one is
    // available, ASCII-only output when it is not.
    const fontsPath = path.join(BE, 'utils', 'pdf-fonts.js');
    assert(fs.existsSync(fontsPath), 'backend/src/utils/pdf-fonts.js is missing');
    delete require.cache[require.resolve(fontsPath)];
    const { registerFonts, formatAmount, RUPEE } = require(fontsPath);

    const PDFDocument = require(path.join(ROOT, 'backend', 'node_modules', 'pdfkit'));
    const doc = new PDFDocument();
    const FONT = registerFonts(doc);
    const sample = FONT.currency + formatAmount(120000);

    doc.font(FONT.regular);
    const [glyphs] = doc._font.encode(sample);
    doc.end();

    // The truncation bug shows up as the raw codepoint appearing as a glyph id.
    assert(
      !glyphs.includes('20b9'),
      'the rupee sign is being encoded through a standard WinAnsi font and will print as a superscript one'
    );

    if (FONT.currency === RUPEE) {
      assert(
        doc._font.constructor.name === 'EmbeddedFont',
        'currency is the rupee sign but the font is not embedded (' + doc._font.constructor.name + ')'
      );
      return 'embedded font, renders ' + sample;
    }
    assert(
      /^[\x20-\x7E]+$/.test(sample),
      'no rupee-capable font found, but the fallback "' + sample + '" is still non-ASCII'
    );
    return 'no rupee font on this machine, safe ASCII fallback: ' + sample;
  });

  await check('B8', 'PDF amounts use a single consistent format', async () => {
    const src = read(path.join(BE, 'features', 'payslips', 'payslip.pdf.js'));
    // toLocaleString() with no locale changes shape with the server's locale, and
    // a literal rupee sign bypasses the font-aware helper.
    assert(!/₹/.test(src), 'payslip.pdf.js still contains a hardcoded rupee sign - route it through money()');
    assert(
      !/\.toLocaleString\(\s*\)/.test(src),
      'payslip.pdf.js calls toLocaleString() with no locale, so amounts change shape per machine'
    );
    assert(/money\(/.test(src), 'payslip.pdf.js does not use the money() helper');
    return 'all amounts go through money()/formatAmount(en-IN)';
  });

  section('STATIC / Configuration');

  await check('CONFIG', 'backend/.env defines every key documented in .env.example', async () => {
    const envPath = path.join(ROOT, 'backend', '.env');
    const examplePath = path.join(ROOT, 'backend', '.env.example');
    assert(fs.existsSync(envPath), 'backend/.env is missing - copy .env.example and fill it in');
    const keysOf = (p) =>
      read(p)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l[0] !== '#' && l.indexOf('=') > 0)
        .map((l) => l.split('=')[0].trim());
    const valuesOf = (p) => {
      const map = new Map();
      for (const line of read(p).split('\n')) {
        const t = line.trim();
        if (!t || t[0] === '#' || t.indexOf('=') < 1) continue;
        const i = t.indexOf('=');
        map.set(t.slice(0, i).trim(), t.slice(i + 1).trim().replace(/^["']|["']$/g, ''));
      }
      return map;
    };
    const have = valuesOf(envPath);
    const want = keysOf(examplePath);
    const missing = want.filter((k) => !have.has(k));
    if (missing.length) {
      throw warn(
        'Missing from backend/.env: ' + missing.join(', ') +
        ' - features relying on these fail at runtime'
      );
    }
    // A key that exists but is blank is just as broken at runtime as a missing one.
    const blank = want.filter((k) => !have.get(k));
    if (blank.length) {
      throw warn(
        'Declared but empty in backend/.env: ' + blank.join(', ') +
        ' - fill these in before demoing the features that need them'
      );
    }
    return want.length + ' keys present and populated';
  });

  await check('CONFIG', 'Vite dev proxy points at the backend port', async () => {
    const vite = read(path.join(ROOT, 'frontend', 'vite.config.js'));
    const target = vite.match(/target:\s*['"]([^'"]+)['"]/);
    assert(target, 'No proxy target found in vite.config.js');
    const portMatch = read(path.join(ROOT, 'backend', '.env')).match(/^PORT=(\d+)/m);
    const envPort = portMatch ? portMatch[1] : '5000';
    assert(
      target[1].endsWith(':' + envPort),
      'Proxy targets ' + target[1] + ' but backend PORT=' + envPort
    );
    return target[1];
  });

  if (build) {
    section('STATIC / Frontend production build');
    await check('BUILD', 'frontend builds without errors (vite build)', async () => {
      const isWin = process.platform === 'win32';
      // Node >=20 on Windows refuses to spawn .cmd shims without a shell.
      const out = execFileSync(isWin ? 'npm.cmd' : 'npm', ['run', 'build'], {
        cwd: path.join(ROOT, 'frontend'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300000,
        shell: isWin,
      });
      const built = out.match(/built in ([\d.]+\s*m?s)/);
      return built ? 'built in ' + built[1] : 'build succeeded';
    });
  }
}

module.exports = { run };
