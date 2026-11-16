import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { validateManifest, type ProjectManifest } from './manifest.ts';
import { type Diagnostic, type Result } from '../diagnostics.ts';
export interface ResolvedProject {
  manifest: ProjectManifest;
  tokenInput: unknown;
  resources: Record<
    string,
    | { status: 'RESOLVED'; path: string }
    | { status: 'NOT_RUN'; milestone: 'M2' | 'M3' }
  >;
}
/** Read JSON only. Never imports project code or executes QA commands. */
export async function loadProject(
  root: string,
  manifestPath = 'wdf/project.json',
): Promise<Result<ResolvedProject>> {
  const diagnostics: Diagnostic[] = [];
  async function file(
    path: string,
    location: string,
  ): Promise<string | undefined> {
    try {
      const base = await realpath(root);
      const target = await realpath(resolve(base, path));
      const rel = relative(base, target);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`))
        throw new Error('Resource escapes project root.');
      if (!(await stat(target)).isFile())
        throw new Error('Resource must be a file.');
      return target;
    } catch (error) {
      diagnostics.push({
        code: 'RESOURCE_UNRESOLVED',
        phase: 'resolution',
        path: location,
        message: `${path}: ${error instanceof Error ? error.message : String(error)}`,
      });
      return undefined;
    }
  }
  async function json(path: string, location: string): Promise<unknown> {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      diagnostics.push({
        code: 'RESOURCE_JSON_INVALID',
        phase: 'resolution',
        path: location,
        message: String(error),
      });
      return undefined;
    }
  }
  const manifestFile = await file(manifestPath, '$');
  if (!manifestFile) return { ok: false, diagnostics };
  const input = await json(manifestFile, '$');
  if (diagnostics.length) return { ok: false, diagnostics };
  const parsed = validateManifest(input);
  if (!parsed.ok) return parsed;
  const manifest = parsed.value;
  const resources: ResolvedProject['resources'] = {};
  const tokenFile = await file(
    manifest.designTokens.entryPoint,
    '$.designTokens.entryPoint',
  );
  const tokenInput = tokenFile
    ? await json(tokenFile, '$.designTokens.entryPoint')
    : undefined;
  if (tokenFile)
    resources['designTokens'] = { status: 'RESOLVED', path: tokenFile };
  for (const name of ['componentRegistry', 'preview'] as const) {
    const resource = manifest[name];
    if (resource.availability === 'deferred')
      resources[name] = { status: 'NOT_RUN', milestone: resource.milestone };
    else {
      const path = await file(resource.entryPoint, `$.${name}.entryPoint`);
      if (path) resources[name] = { status: 'RESOLVED', path };
    }
  }
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: { manifest, tokenInput, resources } };
}
