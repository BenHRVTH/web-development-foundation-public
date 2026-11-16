import type { Plugin } from 'vite';
import type { PreviewConnection } from '@wdf/core/preview';
import { ChangeManager } from './service.ts';

export function changeApi(
  manager: ChangeManager,
  connection: PreviewConnection,
): Plugin {
  return {
    name: 'wdf-change-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (
          path === '/__wdf/qa' &&
          req.method === 'GET' &&
          req.headers.host === new URL(connection.labOrigin).host &&
          (!req.headers.origin || req.headers.origin === connection.labOrigin)
        ) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            '<!doctype html><html lang="hu"><head><title>WDF QA futtató</title></head><body><main aria-label="QA előnézet"></main></body></html>',
          );
          return;
        }
        if (!['/__wdf/state', '/__wdf/change'].includes(path ?? ''))
          return next();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (
          req.headers.host !== new URL(connection.labOrigin).host ||
          req.headers['x-wdf-session'] !== connection.session ||
          (req.headers.origin && req.headers.origin !== connection.labOrigin) ||
          req.headers['sec-fetch-site'] === 'cross-site'
        ) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'LOCAL_ACCESS_DENIED' }));
          return;
        }
        try {
          if (path === '/__wdf/state' && req.method === 'GET') {
            res.end(JSON.stringify(await manager.readView()));
            return;
          }
          if (
            path !== '/__wdf/change' ||
            req.method !== 'POST' ||
            req.headers.origin !== connection.labOrigin ||
            req.headers['content-type'] !== 'application/json'
          ) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'LOCAL_METHOD_OR_ORIGIN_DENIED' }));
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          for await (const chunk of req) {
            bytes += chunk.length;
            if (bytes > 262144) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: 'REQUEST_TOO_LARGE' }));
              return;
            }
            chunks.push(chunk);
          }
          const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (
            input.session !== connection.session ||
            input.projectId !== connection.projectId
          ) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'SESSION_PROJECT_MISMATCH' }));
            return;
          }
          res.end(JSON.stringify(await manager.execute(input)));
        } catch (error) {
          res.statusCode = 409;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}
