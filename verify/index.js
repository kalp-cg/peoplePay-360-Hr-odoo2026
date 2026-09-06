#!/usr/bin/env node
/**
 * PeoplePay360 verification harness.
 *
 *   node verify                  full sweep (static + live API + database)
 *   node verify --static         no server / no database needed
 *   node verify --readonly       skip every write (no payrun or leave request created)
 *   node verify --build          also run `vite build` on the frontend
 *   node verify --no-cleanup     keep the [VERIFY] payrun and leave requests
 *   node verify --port 5173      target the Vite proxy instead of the backend directly
 */
const net = require('net');
const { C, section, check, makeClient, summarise } = require('./runner');
const staticChecks = require('./checks.static');
const apiChecks = require('./checks.api');
const dataChecks = require('./checks.data');

const argv = process.argv.slice(2);
const has = (flag) => argv.indexOf(flag) !== -1;
const valueOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const OPTS = {
  staticOnly: has('--static'),
  readonly: has('--readonly'),
  build: has('--build'),
  cleanup: !has('--no-cleanup'),
  host: valueOf('--host', '127.0.0.1'),
  port: parseInt(valueOf('--port', '0'), 10),
};

function probe(host, port, timeout = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function resolvePort() {
  if (OPTS.port) return OPTS.port;
  // Prefer the Vite proxy so the run exercises exactly the path the browser takes.
  if (await probe(OPTS.host, 5173)) return 5173;
  if (await probe(OPTS.host, 5000)) return 5000;
  return null;
}

async function main() {
  console.log(`${C.bold}${C.cyan}`);
  console.log('  PeoplePay360 - HR & Payroll verification harness');
  console.log(`${C.reset}${C.grey}  static wiring + live API + database invariants, mapped to the problem statement${C.reset}`);

  await staticChecks.run({ build: OPTS.build });

  if (!OPTS.staticOnly) {
    const port = await resolvePort();
    if (!port) {
      section('API / Connectivity');
      await check('SETUP', 'Backend is reachable', async () => {
        throw new Error(
          'Nothing is listening on ' + OPTS.host + ':5173 or :5000.\n' +
          '       Start the stack first (backend: npm start, frontend: npm run dev), or pass --static.'
        );
      });
    } else {
      const via = port === 5173 ? 'Vite proxy -> backend' : 'backend directly';
      console.log(`${C.grey}  target: http://${OPTS.host}:${port} (${via})${C.reset}`);
      const api = makeClient(OPTS.host, port);
      try {
        await apiChecks.run(api, { readonly: OPTS.readonly });
      } catch (err) {
        section('API / Aborted');
        await check('SETUP', 'API suite ran to completion', async () => {
          throw new Error('Suite aborted: ' + err.message);
        });
      }
    }

    let prisma = null;
    try {
      prisma = await dataChecks.run();
    } catch (err) {
      section('DATA / Aborted');
      await check('SETUP', 'Database sweep ran to completion', async () => {
        throw new Error('Could not reach the database through Prisma: ' + err.message);
      });
    }

    if (OPTS.cleanup && !OPTS.readonly) {
      try {
        const removed = await dataChecks.cleanup(apiChecks.TAG);
        const total = Object.values(removed).reduce((a, b) => a + b, 0);
        console.log(`\n${C.grey}  cleanup: removed ${total} ${apiChecks.TAG} records ` +
          `(${removed.payruns} payruns, ${removed.payslips} payslips, ${removed.requests} leave requests); balances restored${C.reset}`);
      } catch (err) {
        console.log(`\n${C.yellow}  cleanup failed: ${err.message} - remove ${apiChecks.TAG} records manually${C.reset}`);
      }
    }

    if (prisma && prisma.$disconnect) await prisma.$disconnect();
  }

  const failures = summarise();
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${C.red}Harness crashed:${C.reset}`, err);
  process.exit(2);
});
