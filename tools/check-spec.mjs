import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const baseline = JSON.parse(
  await readFile(new URL('docs/specification-baseline.json', root), 'utf8'),
);

for (const [name, expected] of Object.entries(baseline.files)) {
  const actual = createHash('sha256')
    .update(await readFile(new URL(name, root)))
    .digest('hex');
  if (actual !== expected) {
    throw new Error(
      `Megváltozott irányadó specifikáció: ${name}. Kifejezett specifikációfrissítés szükséges.`,
    );
  }
  console.log(`PASS ${name} (${actual})`);
}
