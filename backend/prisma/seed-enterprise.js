/**
 * PeoplePay360 — Prisma Seed Entrypoint
 * Delegated to master enterprise seed script (scripts/seed-all.js)
 */

'use strict';

const { main } = require('../scripts/seed-all');

main()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  });
