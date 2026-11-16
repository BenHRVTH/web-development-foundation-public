import { loadProject } from '@wdf/core/node';
import { unwrap } from '@wdf/core';
import { generateTokens } from '@wdf/core/generation';
import { format } from 'prettier';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const project = unwrap(await loadProject(process.cwd()));
const generated = unwrap(generateTokens(project.tokenInput));
await mkdir('src/generated', { recursive: true });
for (const [name, raw, parser] of [
  ['tokens.css', generated.css, 'css'],
  ['tokens.ts', generated.typescript, 'typescript'],
]) {
  const text = await format(raw, {
    parser,
    singleQuote: true,
    trailingComma: 'all',
  });
  const path = `src/generated/${name}`;
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')) !== text)
      throw new Error('GENERATED_OUTPUT_STALE');
  } else await writeFile(path, text);
}
console.log('Contract and generated tokens: PASS');
