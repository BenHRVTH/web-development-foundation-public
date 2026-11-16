#!/usr/bin/env node
import { startLab } from '../src/server.ts';

try {
  const servers = await startLab(process.cwd());
  console.log(
    'WDF UI Lab · Website View / Component Studio · http://127.0.0.1:5175 · persistent Working Draft; explicit QA approval only',
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await servers.close();
    process.exit(0);
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
