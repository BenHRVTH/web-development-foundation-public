import { expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
const npmCli: string =
  process.env['npm_execpath'] ??
  (() => {
    throw new Error('Run this tool through its npm run script.');
  })();
const labUrl = 'http://127.0.0.1:5175';
export function launch(root: string) {
  let log = '';
  const child = spawn(process.execPath, [npmCli, 'run', 'ui-lab'], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  return {
    child,
    log: () => log,
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform === 'win32')
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid!, 'SIGTERM');
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) resolve();
        else child.once('exit', () => resolve());
      });
      await expect
        .poll(
          async () => {
            try {
              await fetch(labUrl);
              return false;
            } catch {
              return true;
            }
          },
          { timeout: 15000 },
        )
        .toBe(true);
    },
  };
}
