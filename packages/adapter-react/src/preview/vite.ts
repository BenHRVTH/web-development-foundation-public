import {
  createServer,
  normalizePath,
  type Plugin,
  type ViteDevServer,
} from 'vite';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  registryCatalog,
  registryTokenIds,
  resolveRegistry,
  type RegistryCatalog,
  type RegistryEntry,
} from '../registry/index.ts';
import { unwrap } from '@wdf/core';
import { type PreviewConnection } from '@wdf/core/preview';

/** Loopback read-only dev server. No save/config/source/command HTTP endpoint. */
export function localReadOnly(origin: string): Plugin {
  return {
    name: 'wdf-local-read-only',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (
          req.headers.host !== new URL(origin).host ||
          (req.headers.origin !== undefined && req.headers.origin !== origin) ||
          !['GET', 'HEAD'].includes(req.method ?? '')
        ) {
          res.statusCode = 403;
          res.end('WDF local server: request rejected.');
          return;
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
      });
    },
  };
}
export interface PreviewServerOptions {
  projectRoot: string;
  previewEntry: string;
  registryEntry?: string | undefined;
  manifest: unknown;
  tokenInput: unknown;
  connection: PreviewConnection;
}
/** Uses the project's own Vite config, index.html and application entry. */
export async function createProjectPreview(
  options: PreviewServerOptions,
): Promise<
  ViteDevServer & {
    wdfCatalog: RegistryCatalog;
    wdfWebsiteQa: unknown;
    wdfTypography: unknown;
  }
> {
  const { connection } = options;
  const virtualId = 'virtual:wdf-preview-bridge';
  const bridge = normalizePath(
    fileURLToPath(new URL('./index.ts', import.meta.url)),
  );
  const studioEntry = normalizePath(
    fileURLToPath(new URL('./studio.tsx', import.meta.url)),
  );
  let catalog: RegistryCatalog = { entries: [], diagnostics: [] };
  let styles: string[] = [];
  const plugin: Plugin = {
    name: 'wdf-preview-bridge',
    enforce: 'pre',
    resolveId(id) {
      if ([virtualId, 'virtual:wdf-studio'].includes(id)) return '\0' + id;
    },
    load(id) {
      if (id === '\0virtual:wdf-studio')
        return `
        import { mountStudio } from ${JSON.stringify(studioEntry)};
        ${options.registryEntry ? `import * as registry from ${JSON.stringify(normalizePath(options.registryEntry))};` : 'const registry = {};'}
        ${styles.map((style) => `import ${JSON.stringify(style)};`).join('\n')}
        mountStudio(${JSON.stringify(options.manifest)}, ${JSON.stringify(options.tokenInput)}, registry.componentRegistry ?? registry.default ?? []);`;
      if (id !== '\0' + virtualId) return;
      return `import { installPreview } from ${JSON.stringify(bridge)};
        import definition from ${JSON.stringify(normalizePath(options.previewEntry))};
        if (definition.version !== '1.0.0') throw new Error('PREVIEW_VERSION_UNSUPPORTED');
        const dispose = installPreview(${JSON.stringify(connection)}, ${JSON.stringify(options.manifest)}, ${JSON.stringify(options.tokenInput)}, ${JSON.stringify(registryTokenIds(catalog))});
        if (import.meta.hot) import.meta.hot.dispose(dispose);`;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/__wdf/studio') return next();
        try {
          const html = await server.transformIndexHtml(
            '/__wdf/studio',
            '<!doctype html><html lang="hu"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Komponens-előnézet</title></head><body><div id="studio-root"></div><script type="module" src="/@id/virtual:wdf-studio"></script></body></html>',
          );
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (error) {
          next(error as Error);
        }
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: '/@id/' + virtualId },
          injectTo: 'head',
        },
      ];
    },
  };
  const server = await createServer({
    root: options.projectRoot,
    // Different dev plugin graphs must never rewrite the standalone server's optimizer cache.
    cacheDir: join(options.projectRoot, 'node_modules/.vite-wdf-preview'),
    // Let Vite discover the project's existing config; no duplicate app entry/config.
    plugins: [localReadOnly(connection.previewOrigin), plugin],
    server: {
      host: '127.0.0.1',
      port: Number(new URL(connection.previewOrigin).port),
      strictPort: true,
      cors: false,
      open: false,
      headers: {
        'Content-Security-Policy': `frame-ancestors ${connection.labOrigin}`,
      },
    },
  });
  try {
    const definition = await server.ssrLoadModule(
      normalizePath(options.previewEntry),
    );
    if (definition['default']?.version !== '1.0.0')
      throw new Error('PREVIEW_VERSION_UNSUPPORTED: expected 1.0.0.');
    const declaredStyles = definition['default']?.studioStyles;
    if (
      declaredStyles !== undefined &&
      (!Array.isArray(declaredStyles) ||
        declaredStyles.some(
          (s: unknown) =>
            typeof s !== 'string' ||
            !/^\/[a-zA-Z0-9_/-]+\.css$/.test(s) ||
            s.includes('..'),
        ))
    )
      throw new Error(
        'STUDIO_STYLES_INVALID: expected project-local CSS paths.',
      );
    styles = declaredStyles ?? [];
    if (options.registryEntry) {
      try {
        const module = await server.ssrLoadModule(
          normalizePath(options.registryEntry),
        );
        const entries: readonly RegistryEntry[] =
          module['componentRegistry'] ?? module['default'];
        if (!Array.isArray(entries))
          throw new Error(
            'Registry must export componentRegistry or default array.',
          );
        catalog = registryCatalog(
          unwrap(
            resolveRegistry(options.manifest, options.tokenInput, entries, {
              fixtureIsolation: true,
              repair: true,
            }),
          ),
        );
      } catch (error) {
        catalog = {
          entries: [],
          diagnostics: [
            {
              code: 'REGISTRY_IMPORT_ERROR',
              phase: 'resolution',
              path: options.registryEntry,
              message: String(error),
            },
          ],
        };
      }
    }
    return Object.assign(server, {
      wdfCatalog: catalog,
      wdfWebsiteQa: definition['default']?.websiteQa,
      wdfTypography: definition['default']?.typography,
    });
  } catch (error) {
    await server.close();
    throw error;
  }
}
