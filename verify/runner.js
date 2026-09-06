/**
 * PeoplePay360 Verification Harness - shared runner + HTTP client.
 * Zero external dependencies (Node built-ins only).
 */
const http = require('http');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', grey: '\x1b[90m',
};

const results = [];
let currentSection = 'GENERAL';

function section(name) {
  currentSection = name;
  console.log(`\n${C.bold}${C.blue}== ${name} ==${C.reset}`);
}

/**
 * @param {string} req  Requirement id from the problem statement (e.g. "A2", "B5", "RBAC")
 */
async function check(req, name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    const ms = Date.now() - started;
    results.push({ section: currentSection, req, name, status: 'PASS', ms });
    console.log(`  ${C.green}PASS${C.reset} ${C.grey}[${req}]${C.reset} ${name}${note ? C.grey + ' - ' + note + C.reset : ''} ${C.grey}(${ms}ms)${C.reset}`);
  } catch (err) {
    const ms = Date.now() - started;
    const soft = err && err.__warn;
    results.push({
      section: currentSection, req, name,
      status: soft ? 'WARN' : 'FAIL',
      message: err.message, ms,
    });
    const tag = soft ? `${C.yellow}WARN${C.reset}` : `${C.red}FAIL${C.reset}`;
    console.log(`  ${tag} ${C.grey}[${req}]${C.reset} ${name}\n       ${C.grey}${err.message}${C.reset}`);
  }
}

/** Throw this to record a non-blocking WARN instead of a FAIL. */
function warn(message) {
  const e = new Error(message);
  e.__warn = true;
  return e;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** Approximate float compare (money is rounded to 2dp by the engine). */
function assertClose(actual, expected, label, tolerance = 0.05) {
  if (Math.abs(Number(actual) - Number(expected)) > tolerance) {
    throw new Error(`${label}: expected ~${expected}, got ${actual}`);
  }
}

function makeClient(host, port) {
  function request(method, path, { token, body, raw = false } = {}) {
    return new Promise((resolve, reject) => {
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      let payload = null;
      if (body !== undefined && body !== null) {
        payload = Buffer.from(JSON.stringify(body));
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = payload.length;
      }
      const req = http.request({ host, port, path, method, headers, timeout: 60000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (raw) return resolve({ status: res.statusCode, headers: res.headers, buffer: buf });
          const text = buf.toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch (_) { /* non-json */ }
          resolve({ status: res.statusCode, headers: res.headers, body: json, text });
        });
      });
      req.on('timeout', () => req.destroy(new Error(`Timeout after 60s: ${method} ${path}`)));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  /** GET/POST that assert a 2xx and return the unwrapped `data` field. */
  async function ok(method, path, opts = {}) {
    const res = await request(method, path, opts);
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`${method} ${path} -> HTTP ${res.status} ${res.text ? res.text.slice(0, 220) : ''}`);
    }
    return res.body && Object.prototype.hasOwnProperty.call(res.body, 'data') ? res.body.data : res.body;
  }

  /** Unwrap either a bare array or a { data, total, page, ... } pagination envelope. */
  function rows(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  return { request, ok, rows, host, port };
}

function summarise() {
  const pass = results.filter((r) => r.status === 'PASS');
  const warnings = results.filter((r) => r.status === 'WARN');
  const fails = results.filter((r) => r.status === 'FAIL');

  console.log(`\n${C.bold}${'='.repeat(72)}${C.reset}`);
  console.log(`${C.bold} VERIFICATION SUMMARY${C.reset}`);
  console.log(`${C.bold}${'='.repeat(72)}${C.reset}`);

  // Coverage grouped by problem-statement requirement id
  const byReq = new Map();
  for (const r of results) {
    if (!byReq.has(r.req)) byReq.set(r.req, { pass: 0, warn: 0, fail: 0 });
    const b = byReq.get(r.req);
    if (r.status === 'PASS') b.pass++;
    else if (r.status === 'WARN') b.warn++;
    else b.fail++;
  }
  const ids = [...byReq.keys()].sort();
  console.log(`\n${C.bold}Requirement coverage${C.reset}`);
  for (const id of ids) {
    const b = byReq.get(id);
    const mark = b.fail > 0 ? `${C.red}X${C.reset}` : b.warn > 0 ? `${C.yellow}!${C.reset}` : `${C.green}OK${C.reset}`;
    console.log(`  ${mark.padEnd(14)} ${id.padEnd(8)} ${b.pass} passed, ${b.warn} warned, ${b.fail} failed`);
  }

  if (fails.length) {
    console.log(`\n${C.bold}${C.red}Failures (must fix before demo)${C.reset}`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. [${f.req}] ${f.name}\n     ${C.grey}${f.message}${C.reset}`));
  }
  if (warnings.length) {
    console.log(`\n${C.bold}${C.yellow}Warnings (data/config gaps, not code bugs)${C.reset}`);
    warnings.forEach((w, i) => console.log(`  ${i + 1}. [${w.req}] ${w.name}\n     ${C.grey}${w.message}${C.reset}`));
  }

  const total = results.length;
  const colour = fails.length ? C.red : warnings.length ? C.yellow : C.green;
  console.log(`\n${colour}${C.bold} ${pass.length}/${total} passed | ${warnings.length} warnings | ${fails.length} failures${C.reset}\n`);
  return fails.length;
}

module.exports = { C, section, check, warn, assert, assertEqual, assertClose, makeClient, summarise, results };
