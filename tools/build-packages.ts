import ts from 'typescript';
import {
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const npmCli: string =
  process.env['npm_execpath'] ??
  (() => {
    throw new Error('Run this tool through its npm run script.');
  })();

export const releaseVersion = '0.1.0-rc.1';
const names = ['foundation', 'core', 'adapter-react', 'qa', 'ui-lab'];
const output = resolve('artifacts/packages');
const compile = resolve('.cache/m6-compile');
async function files(root: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(root, { withFileTypes: true })).map(async (e) => {
        const p = join(root, e.name);
        return e.isDirectory() ? files(p) : [p];
      }),
    )
  ).flat();
}
await rm(compile, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const sources = (
  await Promise.all(names.map((n) => files(resolve('packages', n))))
)
  .flat()
  .filter(
    (p) =>
      /\.(ts|tsx)$/.test(p) && !p.endsWith('.test.ts') && !p.includes('/dist/'),
  );
const parsed = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const options = ts.convertCompilerOptionsFromJson(
  parsed.config.compilerOptions,
  process.cwd(),
).options;
Object.assign(options, {
  noEmit: false,
  newLine: ts.NewLineKind.LineFeed,
  declaration: true,
  declarationMap: false,
  sourceMap: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  rewriteRelativeImportExtensions: true,
  rootDir: resolve('packages'),
  outDir: compile,
});
const program = ts.createProgram(sources, options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }),
  );
  process.exit(1);
}
const emitted = program.emit();
if (emitted.emitSkipped || emitted.diagnostics.length)
  throw new Error('Package emit failed');
for (const file of await files(compile)) {
  let content = await readFile(file, 'utf8');
  // Node ESM requires explicit extensions, including declaration re-exports.
  content = content.replace(
    /(['"])(\.{1,2}\/[^'"\n]+)\1/g,
    (_all, quote: string, spec: string) => {
      let target = spec.replace(/\.(ts|tsx)$/, '.js');
      if (!/\.[a-z]+$/.test(target)) {
        target += ts.sys.fileExists(resolve(dirname(file), target + '.js'))
          ? '.js'
          : '/index.js';
      }
      return quote + target + quote;
    },
  );
  await writeFile(file, content);
}
const inventory = [];
for (const name of names) {
  const source = resolve('packages', name),
    dest = join(output, name);
  await mkdir(dest, { recursive: true });
  await cp(join(compile, name), join(dest, 'dist'), { recursive: true });
  for (const f of (await files(source)).filter(
    (f) => /\.(css|html)$/.test(f) && !f.includes('/node_modules/'),
  )) {
    const relative = f.slice(source.length + 1);
    let content = await readFile(f, 'utf8');
    if (relative === 'index.html')
      content = content.replace('/src/main.tsx', '/src/main.js');
    const target = join(dest, 'dist', relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await cp(join(source, 'README.md'), join(dest, 'README.md'));
  await cp('LICENSE', join(dest, 'LICENSE'));
  const pkg = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  delete pkg.private;
  pkg.version = releaseVersion;
  pkg.engines = { node: '>=24.22.1 <25', npm: '>=11.9.0 <12' };
  pkg.files = ['dist', 'README.md', 'LICENSE'];
  pkg.repository = {
    type: 'git',
    url: 'git+https://github.com/BenHRVTH/web-development-foundation-public.git',
    directory: `packages/${name}`,
  };
  pkg.license = 'UNLICENSED';
  pkg.exports = Object.fromEntries(
    Object.entries(pkg.exports as Record<string, string>).map(
      ([key, value]) => {
        const js = value
          .replace(/^\.\//, './dist/')
          .replace(/\.(ts|tsx)$/, '.js');
        return [key, { types: js.replace(/\.js$/, '.d.ts'), import: js }];
      },
    ),
  );
  pkg.bin = pkg.bin
    ? Object.fromEntries(
        Object.entries(pkg.bin as Record<string, string>).map(([k, v]) => [
          k,
          v.replace('./', './dist/').replace('.ts', '.js'),
        ]),
      )
    : undefined;
  for (const kind of ['dependencies', 'peerDependencies']) {
    if (!pkg[kind]) continue;
    for (const dependency of Object.keys(pkg[kind])) {
      if (dependency.startsWith('@wdf/'))
        pkg[kind][dependency] = releaseVersion;
    }
  }
  // Registry and Studio use both React packages; Vite is an explicit host tool.
  if (name === 'adapter-react')
    pkg.peerDependencies = {
      react: '19.3.1',
      'react-dom': '19.3.1',
      vite: '8.3.8',
    };
  if (name === 'ui-lab')
    pkg.peerDependencies = { vite: '8.3.8', '@vitejs/plugin-react': '6.3.0' };
  await writeFile(
    join(dest, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n',
  );
  const binaries = new Set(
    Object.values(pkg.bin ?? {}).map((value) => resolve(dest, String(value))),
  );
  for (const file of await files(dest))
    await chmod(file, binaries.has(file) ? 0o755 : 0o644);
  const packed = spawnSync(
    process.execPath,
    [
      npmCli,
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      output,
    ],
    {
      cwd: dest,
      encoding: 'utf8',
    },
  );
  if (packed.error || packed.status !== 0)
    throw new Error('npm pack failed: ' + packed.stderr, {
      cause: packed.error,
    });
  const info = JSON.parse(packed.stdout)[0];
  if (
    info.files.some(
      (f: { path: string }) =>
        /(^|\/)(node_modules|\.env|\.git|tests?|test-results)(\/|$)|\.test\.|\.tsx?$/.test(
          f.path,
        ) && !f.path.endsWith('.d.ts'),
    )
  )
    throw new Error('Unexpected package contents');
  const bytes = await readFile(join(output, info.filename));
  inventory.push({
    name: pkg.name,
    version: releaseVersion,
    filename: info.filename,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    files: info.files,
    size: bytes.length,
  });
}
await writeFile(
  join(output, 'inventory.json'),
  JSON.stringify(inventory, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    inventory.map(({ name, version, filename, sha256, size }) => ({
      name,
      version,
      filename,
      sha256,
      size,
    })),
    null,
    2,
  ),
);
