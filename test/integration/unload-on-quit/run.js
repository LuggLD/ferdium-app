#!/usr/bin/env node
/* Runs the unload-on-quit integration test in real Electron.
 *
 * Usage: node test/integration/unload-on-quit/run.js [--expect-bug]
 *   default:      quit with the fix wired in; every lifecycle marker must
 *                 have reached disk (exit 0), otherwise exit 1.
 *   --expect-bug: quit WITHOUT the fix, to demonstrate the bug this guards
 *                 against; succeeds only if the unload markers are missing.
 */
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const electron = require('electron');

const expectBug = process.argv.includes('--expect-bug');
const userData = mkdtempSync(path.join(tmpdir(), 'ferdium-unload-on-quit-'));
const main = path.join(__dirname, 'main.js');

const runPhase = phase =>
  execFileSync(electron, [main], {
    env: {
      ...process.env,
      PHASE: phase,
      UNLOAD: expectBug ? '0' : '1',
      USER_DATA: userData,
    },
    encoding: 'utf8',
    // Electron's own console chatter goes to stderr; keep it out of the report.
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });

try {
  runPhase('write');
  const resultLine = runPhase('read')
    .split('\n')
    .find(line => line.startsWith('RESULT '));
  if (!resultLine) throw new Error('read phase printed no RESULT line');
  const stored = JSON.parse(resultLine.slice('RESULT '.length));
  const markers = ['armed', 'beforeunload', 'pagehide', 'unload'];
  const report = markers.map(m => `${m}=${m in stored ? 'yes' : 'NO'}`);
  process.stdout.write(`persisted after quit: ${report.join(' ')}\n`);

  if (!('armed' in stored)) {
    throw new Error('even the marker written at load time is missing');
  }
  const unloadPersisted = ['beforeunload', 'pagehide', 'unload'].every(
    m => m in stored,
  );
  if (expectBug ? unloadPersisted : !unloadPersisted) {
    throw new Error(
      expectBug
        ? 'unload markers persisted without the fix; the test no longer reproduces the bug'
        : 'unload markers did not reach disk after quitting',
    );
  }
  process.stdout.write(
    expectBug ? 'OK: bug reproduced\n' : 'OK: unload data persisted\n',
  );
} catch (error) {
  process.stderr.write(`FAIL: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  rmSync(userData, { recursive: true, force: true });
}
