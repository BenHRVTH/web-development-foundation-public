import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createProjectPreview, localReadOnly } from '@wdf/adapter-react/vite';
import { resolveLabProject } from './project.ts';
import { registryTokenIds } from '@wdf/adapter-react/registry';
import { ChangeManager } from './change/service.ts';
import { changeApi } from './change/http.ts';
import { browserQa, validateWebsiteQa } from '@wdf/qa/browser';
import type { StorageFault } from './change/storage.ts';

export async function startLab(
  projectRoot: string,
  options: { labPort?: number; fault?: StorageFault } = {},
) {
  const project = await resolveLabProject(projectRoot);
  const connection = {
    projectId: project.manifest.project.id,
    session: randomBytes(32).toString('hex'),
    labOrigin: `http://127.0.0.1:${options.labPort ?? 5175}`,
    previewOrigin: project.previewOrigin,
  };
  let preview: Awaited<ReturnType<typeof createProjectPreview>>;
  const manager: ChangeManager = new ChangeManager({
    root: projectRoot,
    manifest: project.manifest,
    config: project.config,
    evidenceSession: connection.session,
    componentTokenIds: [],
    ...(process.env['WDF_LAB_STORAGE_DIR']
      ? { storageDirectory: process.env['WDF_LAB_STORAGE_DIR'] }
      : {}),
    ...(options.fault ? { fault: options.fault } : {}),
    runQa: (config, context, level, affectedTokenIds, onProgress) =>
      browserQa(
        {
          connection,
          typography: preview.wdfTypography,
          typographyEvidenceDirectory: join(
            manager.storage.directory,
            'evidence',
          ),
          websiteQa: validateWebsiteQa(preview.wdfWebsiteQa),
          manifest: project.manifest,
          catalog: preview.wdfCatalog,
          affectedTokenIds,
          onProgress,
        },
        config,
        context,
        level,
      ),
  });
  await manager.open(true);
  if (manager.storage.durabilityNotice)
    console.warn(manager.storage.durabilityNotice);
  project.config = manager.options.config;
  try {
    preview = await createProjectPreview({
      projectRoot,
      previewEntry: project.previewEntry,
      registryEntry: project.registryEntry,
      manifest: project.manifest,
      tokenInput: project.config,
      connection,
    });
  } catch (error) {
    await manager.close();
    throw error;
  }
  manager.options.componentTokenIds = registryTokenIds(preview.wdfCatalog);
  const bootstrap: Plugin = {
    name: 'wdf-lab-bootstrap',
    resolveId(id) {
      if (id === 'virtual:wdf-project') return '\0' + id;
    },
    load(id) {
      if (id === '\0virtual:wdf-project')
        return `export default ${JSON.stringify({ manifest: project.manifest, config: project.config, widths: project.widths, catalog: preview.wdfCatalog, typography: preview.wdfTypography ?? null, connection })};`;
    },
  };
  const lab = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    plugins: [
      changeApi(manager, connection),
      localReadOnly(connection.labOrigin),
      react(),
      bootstrap,
    ],
    server: {
      host: '127.0.0.1',
      port: options.labPort ?? 5175,
      strictPort: true,
      cors: false,
      open: false,
      headers: {
        'Content-Security-Policy': `frame-ancestors 'none'; frame-src ${connection.previewOrigin}`,
      },
    },
  });
  try {
    await preview.listen();
    await lab.listen();
    await manager.activate();
  } catch (error) {
    await Promise.allSettled([manager.close(), lab.close(), preview.close()]);
    throw error;
  }
  return {
    lab,
    preview,
    async close() {
      await manager.close();
      await Promise.all([lab.close(), preview.close()]);
    },
  };
}
