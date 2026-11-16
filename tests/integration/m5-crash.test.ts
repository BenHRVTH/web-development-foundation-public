import { test, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, access, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ChangeManager } from '../../packages/ui-lab/src/change/service.ts';
import { resolveLabProject } from '../../packages/ui-lab/src/project.ts';

test('Real SIGKILL between authoritative writes leaves a stale process lock and recovers all files before restart', async () => {
  await mkdir('.cache', { recursive: true });
  const root = await mkdtemp(resolve('.cache/m5-sigkill-'));
  let child: ReturnType<typeof spawn> | undefined,
    manager: ChangeManager | undefined;
  try {
    for (const name of [
      'src',
      'wdf',
      'index.html',
      'vite.config.ts',
      'package.json',
    ])
      await cp(resolve('apps/task-manager', name), join(root, name), {
        recursive: true,
      });
    const before = await Promise.all(
      [
        'wdf/tokens.json',
        'src/generated/tokens.css',
        'src/generated/tokens.ts',
      ].map((p) => readFile(join(root, p), 'utf8')),
    );
    const code = `
      import {writeFile} from 'node:fs/promises';
      import {randomUUID} from 'node:crypto';
      import {ChangeManager} from ${JSON.stringify(pathToFileURL(resolve('packages/ui-lab/src/change/service.ts')).href)};
      import {resolveLabProject} from ${JSON.stringify(pathToFileURL(resolve('packages/ui-lab/src/project.ts')).href)};
      import {REQUIRED_APPROVAL_CHECKS} from '@wdf/core/change';
      const root=process.argv[1],project=await resolveLabProject(root);
      const keepAlive=setInterval(()=>{},1000);
      const m=await new ChangeManager({root,manifest:project.manifest,config:project.config,componentTokenIds:[],
        runQa:async(_config,c)=>REQUIRED_APPROVAL_CHECKS.map(ruleId=>({id:randomUUID(),ruleId,severity:'blocker',status:'PASS',target:'SIGKILL unit double',description:'Explicit crash recovery test double',evidence:['Not browser QA; the real QA engine is tested in flow.spec.ts'],configurationDigest:c.configurationDigest,sourceRevision:c.sourceRevision,environment:c.environment})),
        fault:async step=>{if(step==='transaction:css'){await writeFile(root+'/kill-ready','ready');await new Promise(()=>{});}}
      }).open();
      async function send(operation){const v=await m.view();return m.execute({version:'1.0.0',projectId:v.state.projectId,session:'test',requestId:randomUUID(),expectedRevision:v.state.revision,operation});}
      await send({type:'edit',patch:{scope:{kind:'global'},changes:{'semantic.space.page':32}}});
      await send({type:'qa',level:'approval'});await m.waitQa();const v=await m.view();
      await send({type:'approve',runId:v.state.qa.id,configurationDigest:v.context.configurationDigest,confirmed:true});
      clearInterval(keepAlive);
    `;
    child = spawn(process.execPath, ['--input-type=module', '-e', code, root], {
      cwd: resolve('.'),
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += String(data);
    });
    const deadline = Date.now() + 10000;
    for (;;) {
      try {
        await access(join(root, 'kill-ready'));
        break;
      } catch {
        if (child.exitCode !== null || Date.now() > deadline)
          throw new Error(`Child did not reach commit fault: ${stderr}`);
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    const [, signal] = await exited;
    expect(signal).toBe('SIGKILL');
    const project = await resolveLabProject(root);
    manager = await new ChangeManager({
      root,
      manifest: project.manifest,
      config: project.config,
      componentTokenIds: [],
      runQa: async () => [],
    }).open();
    expect(
      await Promise.all(
        [
          'wdf/tokens.json',
          'src/generated/tokens.css',
          'src/generated/tokens.ts',
        ].map((p) => readFile(join(root, p), 'utf8')),
      ),
    ).toEqual(before);
    const restored = await manager.view();
    expect(restored.state.baseline).toBeNull();
    expect(restored.state.draft.tokens['semantic.space.page']?.value).toBe(32);
    expect(
      restored.state.initial.config.tokens['semantic.space.page']?.value,
    ).not.toBe(32);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL');
    await manager?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15000);
