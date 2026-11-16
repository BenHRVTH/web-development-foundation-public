import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { startLab } from '../packages/ui-lab/src/server.ts';
import type { StorageFault } from '../packages/ui-lab/src/change/storage.ts';

/** Each integration scenario is a separate on-disk project, never a second Draft for one project. */
export async function isolatedLab(
  options: {
    port?: number;
    invalid?: boolean;
    fault?: StorageFault;
    configure?: (root: string) => Promise<void>;
  } = {},
) {
  await mkdir('.cache', { recursive: true });
  const root = await mkdtemp(resolve('.cache/m5-browser-'));
  for (const path of [
    'src',
    'wdf',
    'index.html',
    'vite.config.ts',
    'package.json',
  ])
    await cp(resolve('apps/task-manager', path), join(root, path), {
      recursive: true,
    });
  const port = options.port ?? 5195;
  const manifestPath = join(root, 'wdf/project.json'),
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.preview.origin = `http://127.0.0.1:${port + 1}`;
  await writeFile(manifestPath, JSON.stringify(manifest));
  if (options.invalid) {
    const path = join(root, 'wdf/tokens.json'),
      tokens = JSON.parse(await readFile(path, 'utf8'));
    tokens.tokens['semantic.space.heading'].value = 19;
    tokens.tokens['semantic.space.section'].value = 19;
    await writeFile(path, JSON.stringify(tokens));
  }
  await options.configure?.(root);
  let servers: Awaited<ReturnType<typeof startLab>>;
  try {
    servers = await startLab(root, {
      labPort: port,
      ...(options.fault ? { fault: options.fault } : {}),
    });
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  return {
    root,
    url: `http://127.0.0.1:${port}`,
    async restart() {
      await servers.close();
      servers = await startLab(root, {
        labPort: port,
        ...(options.fault ? { fault: options.fault } : {}),
      });
    },
    async close() {
      await servers.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
