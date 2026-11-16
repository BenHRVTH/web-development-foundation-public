import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import type { TypographyReport } from '@wdf/core';
export async function archiveTypography(
  report: TypographyReport,
  directory: string,
) {
  await mkdir(directory, { recursive: true });
  const entries: { source: string; archived: string; sha256: string }[] = [];
  for (const role of report.roles)
    for (const measurement of role.measurements) {
      const samples = [
        measurement['baseline'],
        ...(measurement['options'] as unknown[]),
      ];
      for (const item of samples) {
        const sample = item as { path: string; sha256: string };
        const archived = join(directory, basename(sample.path));
        const sha256 = createHash('sha256')
          .update(await readFile(sample.path))
          .digest('hex');
        if (sha256 !== sample.sha256)
          throw new Error('TYPOGRAPHY_EVIDENCE_CHANGED');
        await cp(sample.path, archived);
        entries.push({ source: sample.path, archived, sha256 });
      }
    }
  await writeFile(
    join(directory, 'manifest.json'),
    JSON.stringify(entries, null, 2) + '\n',
  );
}
