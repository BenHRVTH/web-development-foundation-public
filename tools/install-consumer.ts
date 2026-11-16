import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const npmCli: string =
  process.env['npm_execpath'] ??
  (() => {
    throw new Error('Run this tool through its npm run script.');
  })();
const root = await realpath(await mkdtemp(join(tmpdir(), 'wdf M6 árvíz-')));
await cp('examples/listening-room', root, { recursive: true });
await mkdir(join(root, 'vendor'), { recursive: true });
const inventory = JSON.parse(
  await readFile('artifacts/packages/inventory.json', 'utf8'),
);
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const item of inventory) {
  if (
    createHash('sha256')
      .update(await readFile(join('artifacts/packages', item.filename)))
      .digest('hex') !== item.sha256
  )
    throw new Error('Artifact checksum mismatch');
  await cp(
    join('artifacts/packages', item.filename),
    join(root, 'vendor', item.filename),
  );
  pkg.devDependencies[item.name] = 'file:vendor/' + item.filename;
}
await writeFile(
  join(root, 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n',
);
function run(args: string[]) {
  const r = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, npm_config_cache: resolve('.cache/npm') },
  });
  if (r.error || r.status !== 0)
    throw new Error(`npm ${args.join(' ')} failed: ${r.status}`, {
      cause: r.error,
    });
}
run(['install', '--ignore-scripts', '--save-exact']);
// Reinstall from the consumer's own lockfile; no workspace resolver or symlink.
run(['ci', '--ignore-scripts']);
for (const item of inventory) {
  const path = join(root, 'node_modules', item.name);
  if ((await lstat(path)).isSymbolicLink())
    throw new Error('Symlinked WDF package');
  if (
    JSON.parse(await readFile(join(path, 'package.json'), 'utf8')).version !==
    item.version
  )
    throw new Error('Wrong version');
}
await writeFile(
  join(root, 'package-smoke.mjs'),
  `
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const names = ['foundation','core','adapter-react','qa','ui-lab'];
for (const name of names) {
 const directory = join('node_modules','@wdf',name);
 const pkg = JSON.parse(await readFile(join(directory,'package.json'),'utf8'));
 for (const [subpath, pair] of Object.entries(pkg.exports)) {
  await stat(join(directory,pair.import)); await stat(join(directory,pair.types));
  if (name !== 'ui-lab') await import('@wdf/'+name+(subpath==='.'?'':subpath.slice(1)));
 }
 let refused=false;
 try { await import('@wdf/'+name+'/dist/src/private.js'); }
 catch(error) { refused=error.code==='ERR_PACKAGE_PATH_NOT_EXPORTED'; }
 if(!refused) throw new Error('Unsealed package export boundary');
}
console.log('Installed ESM exports, declarations and private boundaries: PASS');
`,
);
const smoke = spawnSync(process.execPath, ['package-smoke.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
if (smoke.status) throw new Error('Installed public API smoke failed');
run(['ls', '--depth=0']);
run(['run', 'generate:tokens']);
run(['run', 'check:generated']);
run(['run', 'build']);
await rm('artifacts/consumer', { recursive: true, force: true });
await cp(root, 'artifacts/consumer', {
  recursive: true,
  filter: (source) =>
    !['node_modules', 'dist', '.wdf-lab'].includes(basename(source)),
});
await mkdir('test-results', { recursive: true });
await writeFile(
  'test-results/m6-consumer.json',
  JSON.stringify(
    {
      status: 'PASS',
      root,
      snapshot: 'artifacts/consumer',
      lockfileSha256: createHash('sha256')
        .update(await readFile(join(root, 'package-lock.json')))
        .digest('hex'),
      installed: inventory.map(
        (p: { name: string; version: string; sha256: string }) => ({
          name: p.name,
          version: p.version,
          sha256: p.sha256,
        }),
      ),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Installed consumer: ${root}`);
