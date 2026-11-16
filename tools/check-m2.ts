import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateTokens } from '@wdf/core/generation';
import { loadProject } from '@wdf/core/node';
import { unwrap } from '@wdf/core';
const root = resolve('apps/task-manager');
const project = unwrap(await loadProject(root));
if (project.resources['componentRegistry']?.status !== 'RESOLVED')
  throw new Error('M2 requires a resolved Registry entry point.');
const generated = unwrap(generateTokens(project.tokenInput));
const css = await readFile(resolve(root, 'src/app.css'), 'utf8');
for (const match of css.matchAll(/var\((--wdf-[a-z0-9-]+)\)/g))
  if (!generated.css.includes(`${match[1]}:`))
    throw new Error(`Unknown CSS token: ${match[1]}`);
if (/#[\da-fA-F]{3,8}\b/.test(css))
  throw new Error('Raw project color outside canonical tokens.');
if (/--wdf-[a-z0-9-]+\s*:/.test(css))
  throw new Error(
    'Local WDF custom property override bypasses the token engine.',
  );
for (const match of css.matchAll(
  /(?:^|[;{])\s*(?:padding|margin|gap)(?:-[a-z-]+)?\s*:\s*([^;}]+)/gm,
)) {
  const value = match[1]!.replace(/var\([^)]*\)/g, '').trim();
  if (/-?(?:[1-9][\d.]*|0?\.\d+)\s*(?:px|rem|em)\b/.test(value))
    throw new Error(`Raw spacing bypasses Foundation: ${match[0]}`);
}
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      checks: [
        'configured-registry',
        'single-token-source',
        'css-token-resolution',
        'no-raw-color',
        'no-local-token-override',
        'foundation-spacing-consumption',
      ],
      sourceDigest: generated.sourceDigest,
    },
    null,
    2,
  ),
);
