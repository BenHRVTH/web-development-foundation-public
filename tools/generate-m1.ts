import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { contractJsonSchemas, unwrap, WdfError } from '@wdf/core';
import { loadProject } from '@wdf/core/node';
import { generateTokens } from '@wdf/core/generation';
const projectArgument = process.argv.indexOf('--project');
const projectRoot =
  projectArgument >= 0
    ? resolve(process.argv[projectArgument + 1] ?? '.') + '/'
    : fileURLToPath(new URL('../apps/task-manager/', import.meta.url));
try {
  const project = unwrap(await loadProject(projectRoot));
  const generated = unwrap(generateTokens(project.tokenInput));
  const artifacts = [
    ['tokens.css', generated.css, 'css'],
    ['tokens.ts', generated.typescript, 'typescript'],
  ] as const;
  if (!process.argv.includes('--check'))
    await mkdir(`${projectRoot}src/generated`, { recursive: true });
  for (const [name, raw, parser] of artifacts) {
    const content = await format(raw, {
      parser,
      singleQuote: true,
      trailingComma: 'all',
    });
    const path = `${projectRoot}src/generated/${name}`;
    if (process.argv.includes('--check')) {
      let actual: string | undefined;
      try {
        actual = await readFile(path, 'utf8');
      } catch {
        /* Missing output is drift. */
      }
      if (actual !== content)
        throw new WdfError([
          {
            code: 'GENERATED_OUTPUT_STALE',
            phase: 'generation',
            path,
            message: 'Run npm run generate:tokens from the canonical source.',
          },
        ]);
    } else await writeFile(path, content);
  }
  if (projectArgument < 0) {
    const schemaRoot = fileURLToPath(
      new URL('../docs/schemas/', import.meta.url),
    );
    if (!process.argv.includes('--check'))
      await mkdir(schemaRoot, { recursive: true });
    for (const [name, schema] of Object.entries(contractJsonSchemas())) {
      const content = await format(JSON.stringify(schema), { parser: 'json' });
      const path = `${schemaRoot}${name}.schema.json`;
      let actual: string | undefined;
      if (process.argv.includes('--check')) {
        try {
          actual = await readFile(path, 'utf8');
        } catch {
          /* Missing schema is drift. */
        }
        if (actual !== content)
          throw new WdfError([
            {
              code: 'GENERATED_SCHEMA_STALE',
              phase: 'generation',
              path,
              message:
                'Run npm run generate:tokens to regenerate structural schemas.',
            },
          ]);
      } else await writeFile(path, content);
    }
  }
  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        project: project.manifest.project.id,
        sourceDigest: generated.sourceDigest,
        resources: project.resources,
        output: process.argv.includes('--check') ? 'verified' : 'generated',
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: 'ERROR',
        diagnostics:
          error instanceof WdfError
            ? error.diagnostics
            : [{ code: 'GENERATION_IO_ERROR', message: String(error) }],
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
