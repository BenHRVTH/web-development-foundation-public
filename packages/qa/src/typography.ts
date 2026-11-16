import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile, realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { Frame, Page } from '@playwright/test';
import {
  resolveTokens,
  unwrap,
  validateTypographyProfile,
  type EditableTokenConfig,
  type TypographyProfile,
  type TypographyReport,
} from '@wdf/core';
import {
  designEdits,
  previewEnvelope,
  type PreviewConnection,
} from '@wdf/core/preview';
import type { RegistryCatalog } from '@wdf/adapter-react/registry';
import { registryTokenIds } from '@wdf/adapter-react/registry';

async function platformFonts(frame: Frame, selector: string) {
  let session;
  try {
    try {
      session = await frame.page().context().newCDPSession(frame);
    } catch {
      session = await frame.page().context().newCDPSession(frame.page());
    }
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', {
      depth: -1,
      pierce: true,
    });
    type Dom = {
      nodeId: number;
      documentURL?: string;
      children?: Dom[];
      contentDocument?: Dom;
    };
    function find(node: Dom): Dom | undefined {
      if (node.documentURL?.split('#')[0] === frame.url().split('#')[0])
        return node;
      for (const child of [
        ...(node.children ?? []),
        ...(node.contentDocument ? [node.contentDocument] : []),
      ]) {
        const result = find(child);
        if (result) return result;
      }
    }
    const document = find(root);
    if (!document) throw new Error('Application frame DOM not exposed by CDP');
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: document.nodeId,
      selector,
    });
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', {
      nodeId,
    });
    return {
      faces: fonts as {
        familyName: string;
        postScriptName: string;
        isCustomFont: boolean;
        glyphCount: number;
      }[],
    };
  } catch (error) {
    return { unavailableReason: String(error) };
  } finally {
    await session?.detach();
  }
}
function glyphDifference(a: PNG, b: PNG) {
  const width = Math.max(a.width, b.width),
    height = Math.max(a.height, b.height);
  const background = [a.data[0]!, a.data[1]!, a.data[2]!];
  const pixel = (p: PNG, x: number, y: number, c: number) =>
    x < p.width && y < p.height
      ? p.data[(y * p.width + x) * 4 + c]!
      : background[c]!;
  let changedPixels = 0,
    inkPixels = 0,
    maxChannelDelta = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let delta = 0,
        ink = 0;
      for (let c = 0; c < 3; c++) {
        const av = pixel(a, x, y, c),
          bv = pixel(b, x, y, c);
        delta = Math.max(delta, Math.abs(av - bv));
        ink = Math.max(
          ink,
          Math.abs(av - background[c]!),
          Math.abs(bv - background[c]!),
        );
      }
      if (ink >= 8) inkPixels++;
      if (delta >= 8) changedPixels++;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
  const changedInkRatio = changedPixels / Math.max(inkPixels, 1);
  return {
    changedPixels,
    inkPixels,
    maxChannelDelta,
    changedInkRatio,
    distinct: changedPixels >= 20 && changedInkRatio >= 0.01,
  };
}

const families = (s: string) =>
  s
    .toLowerCase()
    .replace(/["']/g, '')
    .split(',')
    .map((v) => v.trim())
    .join(',');
/** Same authenticated snapshot protocol as ordinary preview; never a CSS/DOM override. */
async function apply(
  page: Page,
  config: EditableTokenConfig,
  catalog: RegistryCatalog,
  connection: PreviewConnection,
) {
  await page.evaluate(
    ({ edits, envelope, origin }) =>
      new Promise<void>((resolve, reject) => {
        const frame = document.querySelector('iframe')!;
        let revision = 0;
        const finish = (error?: string) => {
          clearTimeout(timer);
          clearInterval(reconnect);
          window.removeEventListener('message', receive);
          if (error) reject(new Error(error));
          else resolve();
        };
        const receive = (e: MessageEvent) => {
          if (
            e.source !== frame.contentWindow ||
            e.origin !== origin ||
            e.data?.channel !== envelope.channel ||
            e.data?.session !== envelope.session ||
            e.data?.projectId !== envelope.projectId ||
            e.data?.version !== envelope.version
          )
            return;
          if (e.data.type === 'ready') {
            revision = Math.max(revision + 1, e.data.revision + 1, Date.now());
            frame.contentWindow!.postMessage(
              { ...envelope, type: 'apply-design', revision, edits },
              origin,
            );
          }
          if (e.data.type === 'applied' && e.data.revision === revision)
            finish();
          if (e.data.type === 'error' && e.data.revision === revision)
            finish(e.data.message);
        };
        const connect = () =>
          frame.contentWindow!.postMessage(
            { ...envelope, type: 'connect' },
            origin,
          );
        const timer = setTimeout(
          () => finish('TYPOGRAPHY_PREVIEW_ACK_TIMEOUT'),
          10000,
        );
        const reconnect = setInterval(connect, 250);
        window.addEventListener('message', receive);
        connect();
      }),
    {
      edits: designEdits(config, registryTokenIds(catalog)),
      envelope: previewEnvelope(connection),
      origin: connection.previewOrigin,
    },
  );
}
async function capture(frame: Frame, selector: string, path: string) {
  const element = frame.locator(selector).first();
  await element.waitFor({ state: 'visible' });
  // Scroll before font/paint settling, not implicitly during the final capture.
  await element.scrollIntoViewIfNeeded();
  // These are normal-state font samples. A pointer left by an earlier fixture
  // must not change hover as a weight alters wrapping beneath it. Move the
  // real pointer outside this QA iframe; never override hover CSS or mask it.
  const viewport = frame.page().viewportSize();
  const owner = await frame.frameElement();
  const box = await owner.boundingBox();
  await owner.dispose();
  const point =
    viewport &&
    box &&
    [
      { x: viewport.width - 1, y: viewport.height - 1 },
      { x: 0, y: 0 },
      { x: viewport.width - 1, y: 0 },
      { x: 0, y: viewport.height - 1 },
    ].find(
      ({ x, y }) =>
        x < box.x ||
        x >= box.x + box.width ||
        y < box.y ||
        y >= box.y + box.height,
    );
  if (!point) throw new Error('TYPOGRAPHY_POINTER_ISOLATION_UNAVAILABLE');
  await frame.page().mouse.move(point.x, point.y);
  await element.evaluate(async (el) => {
    const c = getComputedStyle(el);
    await document.fonts.load(
      `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`,
      el.textContent ?? '',
    );
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
  const actual = await element.evaluate((el) => {
    const c = getComputedStyle(el);
    return {
      text: el.textContent ?? '',
      family: c.fontFamily,
      size: parseFloat(c.fontSize),
      weight: Number(c.fontWeight),
      style: c.fontStyle,
      color: c.color,
      letterSpacing: c.letterSpacing,
      fontsLoaded:
        document.fonts.status === 'loaded' &&
        document.fonts.check(
          `${c.fontWeight} ${c.fontSize} ${c.fontFamily}`,
          el.textContent ?? '',
        ),
    };
  });
  const buffer = await element.screenshot({ animations: 'disabled' });
  await writeFile(path, buffer, { mode: 0o600 });
  return {
    actual,
    platformFonts: await platformFonts(frame, selector),
    path,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    png: PNG.sync.read(buffer),
  };
}
export class TypographyProbe {
  readonly report: TypographyReport;
  private profile: TypographyProfile | null = null;
  private directory = '';
  private config: EditableTokenConfig;
  private catalog: RegistryCatalog;
  private connection: PreviewConnection;
  private evidenceDirectory: string;
  private widths: number[];
  constructor(
    input: unknown,
    config: EditableTokenConfig,
    catalog: RegistryCatalog,
    connection: PreviewConnection,
    evidenceDirectory: string,
    widths: number[],
  ) {
    this.config = config;
    this.catalog = catalog;
    this.connection = connection;
    this.evidenceDirectory = evidenceDirectory;
    this.widths = widths;
    this.report = {
      schemaVersion: '1.0.0',
      session: connection.session,
      status: 'ERROR',
      roles: [],
      errors: [],
    };
    try {
      this.profile = validateTypographyProfile(input, config);
      for (const role of this.profile.roles) {
        for (const target of role.targets)
          if (
            target.workspace === 'studio' &&
            !catalog.entries.some(
              (e) =>
                e.id === target.component &&
                e.fixtures.some((f) => f.id === target.fixture),
            )
          )
            throw new Error('TYPOGRAPHY_FIXTURE_UNKNOWN: ' + role.id);
        this.report.roles.push({
          id: role.id,
          weightToken: role.weightToken,
          verifiedWeights: [...role.weights].sort((a, b) => b - a),
          rejectedWeights: [],
          currentValues: [],
          errors: [],
          measurements: [],
        });
      }
    } catch (error) {
      this.report.errors.push(String(error));
      this.profile = null;
    }
  }
  get components() {
    return (
      this.profile?.roles.flatMap((r) =>
        r.targets.flatMap((t) =>
          t.workspace === 'studio' ? [t.component] : [],
        ),
      ) ?? []
    );
  }
  async measure(
    frame: Frame,
    page: Page,
    width: number,
    component: string,
    fixture: string,
  ) {
    if (!this.profile) return;
    if (!this.directory) {
      await mkdir(this.evidenceDirectory, { recursive: true, mode: 0o700 });
      if (
        relative(
          await realpath(this.evidenceDirectory),
          resolve(this.evidenceDirectory),
        ) !== ''
      )
        throw new Error('TYPOGRAPHY_EVIDENCE_SYMLINK_FORBIDDEN');
      this.directory = join(this.evidenceDirectory, randomUUID());
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
    }
    const resolved = unwrap(resolveTokens(this.config));
    const tokens =
      Object.values(resolved.responsive)
        .filter((r) => r.minWidth <= width)
        .sort((a, b) => a.minWidth - b.minWidth)
        .at(-1)?.tokens ?? resolved.base;
    for (const role of this.profile.roles) {
      const result = this.report.roles.find((r) => r.id === role.id)!;
      for (const [targetIndex, target] of role.targets.entries()) {
        const matches =
          target.workspace === 'website'
            ? component === 'website' && fixture === 'normal'
            : target.component === component && target.fixture === fixture;
        if (!matches) continue;
        const prefix = join(
          this.directory,
          `${role.id}-${width}-${component.replace(/[^a-zA-Z0-9_-]/g, '_')}-${fixture.replace(/[^a-zA-Z0-9_-]/g, '_')}-${targetIndex}`,
        );
        try {
          const baseline = await capture(
            frame,
            target.selector,
            prefix + '-baseline.png',
          );
          const expected = {
            family: String(tokens[role.familyToken]!.value),
            size: Number(tokens[role.sizeToken]!.value),
            weight: Number(tokens[role.weightToken]!.value),
          };
          if (!result.currentValues.includes(expected.weight))
            result.currentValues.push(expected.weight);
          const baselineMatches =
            families(baseline.actual.family) === families(expected.family) &&
            baseline.actual.size === expected.size &&
            baseline.actual.weight === expected.weight &&
            baseline.actual.fontsLoaded &&
            baseline.actual.text.trim().length > 0;
          if (!baselineMatches)
            result.errors.push(
              `TYPOGRAPHY_COMPUTED_MISMATCH: ${width}/${component}/${fixture}`,
            );
          const shots = [];
          for (const weight of role.weights) {
            const candidate = structuredClone(this.config);
            candidate.tokens[role.weightToken]!.value = weight;
            for (const rule of Object.values(candidate.responsive ?? {}))
              if (Object.hasOwn(rule.overrides, role.weightToken))
                rule.overrides[role.weightToken] = weight;
            await apply(page, candidate, this.catalog, this.connection);
            const shot = await capture(
              frame,
              target.selector,
              prefix + `-${weight}.png`,
            );
            shots.push({ weight, ...shot });
          }
          const comparisons: {
            weights: number[];
            status: string;
            evidence: string[];
            distinct: boolean;
            sameContext: boolean;
            changedPixels: number;
            inkPixels: number;
            maxChannelDelta: number;
            changedInkRatio: number;
          }[] = [];
          for (let i = 0; i < shots.length; i++)
            for (let j = i + 1; j < shots.length; j++) {
              const a = shots[i]!,
                b = shots[j]!;
              const difference = glyphDifference(a.png, b.png);
              const sameContext =
                a.actual.text === b.actual.text &&
                a.actual.family === b.actual.family &&
                a.actual.size === b.actual.size &&
                a.actual.color === b.actual.color &&
                a.actual.style === b.actual.style &&
                a.actual.letterSpacing === b.actual.letterSpacing;
              const distinct =
                sameContext &&
                a.actual.weight === a.weight &&
                b.actual.weight === b.weight &&
                a.actual.fontsLoaded &&
                b.actual.fontsLoaded &&
                difference.distinct;
              comparisons.push({
                weights: [a.weight, b.weight],
                ...difference,
                sameContext,
                status: distinct ? 'PASS' : 'FAIL',
                evidence: [a.path, b.path],
              });
            }
          // Prefer the current declared CSS representative; collapsed aliases stay rejected.
          const order = [
            expected.weight,
            ...[...role.weights].sort((a, b) => b - a),
          ].filter(
            (weight, index, all) =>
              role.weights.includes(weight) && all.indexOf(weight) === index,
          );
          const verified: number[] = [];
          for (const weight of order) {
            const shot = shots.find((s) => s.weight === weight)!;
            if (
              shot.actual.weight === weight &&
              shot.actual.fontsLoaded &&
              verified.every(
                (v) =>
                  comparisons.find(
                    (c) => c.weights.includes(v) && c.weights.includes(weight),
                  )?.status === 'PASS',
              )
            )
              verified.push(weight);
          }
          const bindingMatches = shots.every((shot) => {
            const matches =
              shot.actual.weight === shot.weight &&
              shot.actual.family === baseline.actual.family &&
              shot.actual.size === baseline.actual.size &&
              shot.actual.text === baseline.actual.text &&
              shot.actual.style === baseline.actual.style &&
              shot.actual.color === baseline.actual.color &&
              shot.actual.letterSpacing === baseline.actual.letterSpacing;
            if (!matches)
              result.errors.push(
                `TYPOGRAPHY_OPTION_BINDING_MISMATCH: ${width}/${component}/${fixture}/${shot.weight}`,
              );
            return matches;
          });
          result.verifiedWeights = result.verifiedWeights.filter(
            (w) => baselineMatches && bindingMatches && verified.includes(w),
          );
          const baselineEvidence = {
            actual: baseline.actual,
            platformFonts: baseline.platformFonts,
            path: baseline.path,
            sha256: baseline.sha256,
          };
          result.measurements.push(
            JSON.parse(
              JSON.stringify({
                width,
                component,
                fixture,
                targetIndex,
                selector: target.selector,
                expected,
                baseline: baselineEvidence,
                baselineMatches,
                options: shots.map((s) => ({
                  weight: s.weight,
                  actual: s.actual,
                  platformFonts: s.platformFonts,
                  path: s.path,
                  sha256: s.sha256,
                })),
                comparisons,
                identicalRasterRejected: !glyphDifference(
                  shots[0]!.png,
                  shots[0]!.png,
                ).distinct,
              }),
            ),
          );
        } catch (error) {
          result.errors.push(String(error));
          this.report.errors.push(`${role.id}: ${String(error)}`);
          result.verifiedWeights = [];
        } finally {
          await apply(page, this.config, this.catalog, this.connection);
        }
      }
    }
  }
  finish(): TypographyReport {
    if (!this.profile) return this.report;
    for (const role of this.profile.roles) {
      const r = this.report.roles.find((v) => v.id === role.id)!;
      if (r.measurements.length !== role.targets.length * this.widths.length) {
        r.errors.push('TYPOGRAPHY_TARGET_NOT_MEASURED');
        this.report.errors.push('TYPOGRAPHY_TARGET_NOT_MEASURED: ' + role.id);
        r.verifiedWeights = [];
      }
      r.rejectedWeights = role.weights.filter(
        (w) => !r.verifiedWeights.includes(w),
      );
      if (r.verifiedWeights.length < 1)
        r.errors.push('TYPOGRAPHY_NO_DISTINCT_OPTIONS');
      for (const w of r.currentValues)
        if (!r.verifiedWeights.includes(w))
          r.errors.push(`TYPOGRAPHY_CURRENT_WEIGHT_NOT_VERIFIED: ${w}`);
    }
    this.report.status = this.report.errors.length
      ? 'ERROR'
      : this.report.roles.some((r) => r.errors.length)
        ? 'FAIL'
        : 'PASS';
    return this.report;
  }
}
