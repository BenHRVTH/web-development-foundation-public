import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  lstat,
  realpath,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path';
import { z } from 'zod';
import { canonicalJson } from '@wdf/core/generation';
import {
  stateSchema,
  changesBetween,
  type ChangeState,
} from '@wdf/core/change';

export const digest = (value: unknown) =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');
const envelopeSchema = z.strictObject({
  format: z.literal('wdf-change@1'),
  checksum: z.string(),
  payload: stateSchema,
});
export function encodeState(state: ChangeState) {
  stateSchema.parse(state);
  return (
    JSON.stringify(
      { format: 'wdf-change@1', checksum: digest(state), payload: state },
      null,
      2,
    ) + '\n'
  );
}
export function decodeState(raw: string): ChangeState {
  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw));
    if (digest(envelope.payload) !== envelope.checksum)
      throw new Error('CHECKSUM_MISMATCH');
    const state = envelope.payload;
    if (state.cursor > state.history.length) throw new Error('HISTORY_CURSOR');
    if (
      state.history.length &&
      digest(state.history[0]!.before) !== digest(state.initial.config)
    )
      throw new Error('HISTORY_INITIAL_MISMATCH');
    for (const entry of state.history)
      if (
        digest(changesBetween(entry.before, entry.after)) !==
        digest(entry.changes)
      )
        throw new Error('HISTORY_CHANGES_MISMATCH');
    for (let i = 1; i < state.history.length; i++)
      if (
        digest(state.history[i - 1]!.after) !== digest(state.history[i]!.before)
      )
        throw new Error('HISTORY_CHAIN');
    const expected = state.cursor
      ? state.history[state.cursor - 1]!.after
      : (state.history[0]?.before ?? state.draft);
    if (digest(expected) !== digest(state.draft))
      throw new Error('HISTORY_DRAFT_MISMATCH');
    return state;
  } catch (error) {
    throw new Error(
      `STORAGE_CORRUPT: a mentés megmaradt; nincs alapértelmezett helyettesítés. ${String(error)}`,
      { cause: error },
    );
  }
}
const journalSchema = z.strictObject({
  version: z.literal(1),
  checksum: z.string(),
  entries: z
    .array(
      z.strictObject({
        id: z.enum(['tokens', 'css', 'ts', 'state']),
        before: z.string().nullable(),
        after: z.string(),
      }),
    )
    .min(1),
});
type FileId = z.infer<typeof journalSchema>['entries'][number]['id'];
/** Test-only dependency injection is never accepted by the HTTP protocol. */
export type StorageFault = (step: string) => void | Promise<void>;
export class SimulatedCrash extends Error {}
const ownerSchema = z.strictObject({
  pid: z.number().int().positive(),
  leaseId: z.uuid().optional(),
  birth: z.string().optional(),
});
type LockOwner = z.infer<typeof ownerSchema>;
async function processInfo(pid: number) {
  if (process.platform !== 'linux') return null;
  try {
    const raw = await readFile(`/proc/${pid}/stat`, 'utf8');
    const fields = raw
      .slice(raw.lastIndexOf(')') + 2)
      .trim()
      .split(/\s+/);
    return {
      state: fields[0],
      birth: `${(await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim()}:${fields[19]}`,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { state: 'X', birth: '' };
    throw error;
  }
}
async function deadOwner(owner: LockOwner) {
  try {
    process.kill(owner.pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
    throw error;
  }
  const info = await processInfo(owner.pid);
  return (
    !!info &&
    (['Z', 'X'].includes(info.state ?? '') ||
      (!!owner.birth && owner.birth !== info.birth))
  );
}

/** Native relative paths also reject other Windows drives and UNC shares. */
export function isWithin(
  base: string,
  target: string,
  paths: Pick<typeof import('node:path'), 'relative' | 'isAbsolute' | 'sep'> = {
    relative,
    isAbsolute,
    sep,
  },
) {
  const rel = paths.relative(base, target);
  return (
    !paths.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${paths.sep}`)
  );
}

export const WINDOWS_DURABILITY_NOTICE =
  'STORAGE_DURABILITY_LIMIT: Windows alatt a Node nem biztosít könyvtár-fsync-et. A fájl-fsync, atomikus csere és folyamatmegszakítás utáni journal-helyreállítás aktív; áramszünet vagy operációsrendszer-összeomlás utáni tartósság nem garantált. Helyi NTFS szükséges; hálózati tároló nem támogatott.';

export class ChangeStorage {
  readonly root: string;
  readonly directory: string;
  readonly storageRoot: string;
  readonly durabilityNotice =
    process.platform === 'win32' ? WINDOWS_DURABILITY_NOTICE : '';
  readonly paths: Record<FileId, string>;
  private locked = false;
  recovered = false;
  readonly fault: StorageFault | undefined;
  private leaseId = randomUUID();
  constructor(
    root: string,
    projectId: string,
    tokenEntry: string,
    storageDirectory?: string,
    fault?: StorageFault,
  ) {
    this.fault = fault;
    this.root = resolve(root);
    this.storageRoot = storageDirectory ? resolve(storageDirectory) : this.root;
    this.directory = storageDirectory
      ? resolve(storageDirectory, projectId)
      : join(this.root, '.wdf-lab', projectId);
    this.paths = {
      tokens: resolve(this.root, tokenEntry),
      css: join(this.root, 'src/generated/tokens.css'),
      ts: join(this.root, 'src/generated/tokens.ts'),
      state: join(this.directory, 'state.json'),
    };
  }
  async safe(path: string, base: string) {
    path = resolve(path);
    base = resolve(base);
    if (!isWithin(base, path)) throw new Error('STORAGE_PATH_FORBIDDEN');
    // The anchor may not exist on first startup (including an explicit storage
    // root). Validate its nearest existing ancestor before inspecting children.
    let existing = base;
    for (;;) {
      try {
        const stat = await lstat(existing);
        if (stat.isSymbolicLink()) throw new Error('STORAGE_SYMLINK_FORBIDDEN');
        if (!stat.isDirectory()) throw new Error('STORAGE_PATH_NOT_DIRECTORY');
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const parent = dirname(existing);
        if (parent === existing) throw error;
        existing = parent;
      }
    }
    // relative() respects Windows case-insensitive spelling; string equality
    // would incorrectly reject a legitimate drive/directory case difference.
    if (relative(await realpath(existing), existing) !== '')
      throw new Error('STORAGE_SYMLINK_FORBIDDEN');
    let current = existing;
    const parts = relative(existing, path).split(sep).filter(Boolean);
    for (const [index, part] of parts.entries()) {
      current = join(current, part);
      try {
        const stat = await lstat(current);
        if (stat.isSymbolicLink()) throw new Error('STORAGE_SYMLINK_FORBIDDEN');
        if (index < parts.length - 1 && !stat.isDirectory())
          throw new Error('STORAGE_PATH_NOT_DIRECTORY');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
  private async syncDirectory(path: string) {
    // This is a declared platform capability, never a catch-and-ignore fallback.
    // Windows file handles still use sync() (FlushFileBuffers); Node cannot open
    // a directory for fsync there. The limitation is exposed in CLI and state.
    if (process.platform === 'win32') return;
    await this.fault?.('directory:sync');
    const handle = await open(path, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  private async ensureDirectory(path: string, base: string) {
    await this.safe(path, base);
    const missing: string[] = [];
    let current = path;
    for (;;) {
      try {
        await lstat(current);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        missing.push(current);
        current = dirname(current);
      }
    }
    for (const directory of missing.reverse()) {
      try {
        await mkdir(directory, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      await this.safe(directory, current);
      if (!(await lstat(directory)).isDirectory())
        throw new Error('STORAGE_PATH_NOT_DIRECTORY');
      await this.syncDirectory(dirname(directory));
    }
  }
  async acquire(): Promise<void> {
    await this.ensureDirectory(this.directory, this.storageRoot);
    const lock = join(this.directory, 'lock.json');
    await this.safe(lock, this.directory);
    const info = await processInfo(process.pid);
    if (info?.state === 'X')
      throw new Error(
        'STORAGE_PROCESS_ID_UNAVAILABLE: a folyamat azonossága nem ellenőrizhető.',
      );
    const me: LockOwner = {
      pid: process.pid,
      leaseId: this.leaseId,
      ...(info ? { birth: info.birth } : {}),
    };
    try {
      const handle = await open(lock, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify(me));
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const owner = ownerSchema.parse(JSON.parse(await readFile(lock, 'utf8')));
      if (await deadOwner(owner)) return this.reclaim(lock, owner, me);
      throw new Error(
        'STORAGE_BUSY: ehhez a projekthez már fut egy Change Manager.',
        { cause: error },
      );
    }
    this.locked = true;
    await this.recover();
  }
  private async reclaim(
    lock: string,
    original: LockOwner,
    me: LockOwner,
  ): Promise<void> {
    let holder = original;
    for (let attempt = 0; attempt < 64; attempt++) {
      // Append-only claims serialize stale-lock takeover. Never unlink another
      // contender's live lock, even if both observed the same dead owner.
      const path = join(
        this.directory,
        `reclaim-${holder.leaseId ?? `pid-${holder.pid}`}.json`,
      );
      await this.safe(path, this.directory);
      try {
        const handle = await open(path, 'wx', 0o600);
        try {
          await handle.writeFile(JSON.stringify(me));
          await handle.sync();
        } finally {
          await handle.close();
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        holder = ownerSchema.parse(JSON.parse(await readFile(path, 'utf8')));
        if (await deadOwner(holder)) continue;
        throw new Error(
          'STORAGE_BUSY: másik folyamat veszi vissza a lezárt munkamenetet.',
          { cause: error },
        );
      }
      const current = ownerSchema.parse(
        JSON.parse(await readFile(lock, 'utf8')),
      );
      if (digest(current) === digest(original)) await rm(lock);
      return this.acquire();
    }
    throw new Error(
      'STORAGE_LOCK_RECOVERY_LIMIT: túl sok megszakított visszavétel; őrizd meg és ellenőrizd a mentést.',
    );
  }
  async close() {
    if (this.locked) {
      await rm(join(this.directory, 'lock.json'));
      this.locked = false;
    }
  }
  async read(id: FileId): Promise<string | null> {
    const path = this.paths[id];
    await this.safe(path, id === 'state' ? this.directory : this.root);
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  private async atomic(path: string, data: string) {
    const base = isWithin(this.directory, path) ? this.directory : this.root;
    await this.safe(path, base);
    await this.ensureDirectory(dirname(path), base);
    const temp = path + `.${randomUUID()}.tmp`;
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temp, path);
      await this.syncDirectory(dirname(path));
    } finally {
      await rm(temp, { force: true });
    }
  }
  async save(state: ChangeState) {
    await this.fault?.('save:before');
    await this.atomic(this.paths.state, encodeState(state));
    await this.fault?.('save:after');
  }
  private async removeJournal(path: string) {
    await rm(path);
    await this.syncDirectory(this.directory);
  }
  async transaction(contents: Record<FileId, string>) {
    const entries = await Promise.all(
      (['tokens', 'css', 'ts', 'state'] as const).map(async (id) => ({
        id,
        before: await this.read(id),
        after: contents[id],
      })),
    );
    const journal = join(this.directory, 'transaction.json');
    try {
      await this.atomic(
        journal,
        JSON.stringify({ version: 1, checksum: digest(entries), entries }),
      );
      await this.fault?.('transaction:prepared');
      for (const entry of entries) {
        await this.atomic(this.paths[entry.id], entry.after);
        await this.fault?.(`transaction:${entry.id}`);
      }
      await this.removeJournal(journal);
    } catch (error) {
      if (error instanceof SimulatedCrash) throw error;
      try {
        await this.recover();
      } catch (recoveryError) {
        throw new Error(`RECOVERY_FAILED: ${String(recoveryError)}`, {
          cause: recoveryError,
        });
      }
      // A fault after the durable commit marker is a completed transaction.
      if ((await this.read('state')) === contents.state) return;
      throw new Error(
        `FINALIZE_ROLLED_BACK: a korábbi projekt és Baseline megmaradt. ${String(error)}`,
        { cause: error },
      );
    }
  }
  async recover() {
    const path = join(this.directory, 'transaction.json');
    await this.safe(path, this.directory);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const journal = journalSchema.parse(JSON.parse(raw));
    if (journal.checksum !== digest(journal.entries))
      throw new Error('RECOVERY_JOURNAL_CHECKSUM');
    this.recovered = true;
    if (
      new Set(journal.entries.map((e) => e.id)).size !== 4 ||
      journal.entries.length !== 4
    )
      throw new Error('RECOVERY_JOURNAL_INVALID');
    const marker = journal.entries.find((e) => e.id === 'state')!;
    const committed = (await this.read('state')) === marker.after;
    for (const entry of journal.entries) {
      const current = await this.read(entry.id);
      if (current !== entry.before && current !== entry.after)
        throw new Error(
          'RECOVERY_EXTERNAL_CONFLICT: a fájlokat őrizd meg, kézi helyreállítás szükséges.',
        );
      if (committed && current !== entry.after)
        throw new Error('RECOVERY_COMMIT_INCONSISTENT');
    }
    if (!committed)
      for (const entry of journal.entries) {
        if (entry.before === null) {
          await this.safe(
            this.paths[entry.id],
            entry.id === 'state' ? this.directory : this.root,
          );
          await rm(this.paths[entry.id], { force: true });
          // A prepared journal can precede creation of the generated directory.
          // Flush the nearest existing parent of the now-absent entry instead
          // of failing recovery because its immediate parent never existed.
          let parent = dirname(this.paths[entry.id]);
          for (;;) {
            try {
              await lstat(parent);
              break;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
                throw error;
              parent = dirname(parent);
            }
          }
          await this.syncDirectory(parent);
        } else await this.atomic(this.paths[entry.id], entry.before);
      }
    await this.removeJournal(path);
  }
}
