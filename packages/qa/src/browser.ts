import { TypographyProbe } from './typography.ts';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, type Frame, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  resolveTokens,
  type EditableTokenConfig,
  type QualityEvidence,
  type ProjectManifest,
} from '@wdf/core';
import {
  liveAudit,
  type QualityContext,
  type QualityRun,
} from '@wdf/core/change';
import {
  designEdits,
  previewEnvelope,
  type PreviewConnection,
} from '@wdf/core/preview';
import {
  registryTokenIds,
  type RegistryCatalog,
} from '@wdf/adapter-react/registry';

const versions = new Map<string, string>();
export async function browserEnvironment() {
  const path =
    process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] ??
    chromium.executablePath();
  try {
    const info = await stat(path),
      key = `${path}:${info.size}:${info.mtimeMs}`;
    if (!versions.has(key))
      versions.set(
        key,
        (
          await promisify(execFile)(path, ['--version'], { timeout: 3000 })
        ).stdout.trim(),
      );
    return {
      path,
      key,
      version: versions.get(key),
      renderer: 'disable-gpu;disable-partial-raster',
      locale: 'hu-HU',
      timezone: 'Europe/Budapest',
    };
  } catch (error) {
    return { path, version: 'unavailable', diagnostic: String(error) };
  }
}

export interface WebsiteQa {
  readySelector: string;
  controls: string;
  cards: { selector: string; token: string; fixtureStates?: string[] }[];
  cases: {
    id: 'normal' | 'error' | 'long' | 'empty' | 'missing';
    url: string;
    prepare?: (frame: Frame, page: Page, width: number) => Promise<void>;
  }[];
}
/** Trusted project-side integration, never accepted from HTTP or postMessage. */
export function defineWebsiteQa(input: WebsiteQa): WebsiteQa {
  return input;
}
export function validateWebsiteQa(input: unknown): WebsiteQa {
  const value = input as WebsiteQa | undefined;
  if (
    !value ||
    typeof value.readySelector !== 'string' ||
    !value.readySelector ||
    typeof value.controls !== 'string' ||
    !value.controls ||
    !Array.isArray(value.cards) ||
    value.cards.some(
      (c) =>
        !c ||
        typeof c.selector !== 'string' ||
        !c.selector ||
        typeof c.token !== 'string' ||
        (c.fixtureStates !== undefined &&
          (!Array.isArray(c.fixtureStates) ||
            !c.fixtureStates.length ||
            c.fixtureStates.some(
              (state) => typeof state !== 'string' || !state,
            ))),
    ) ||
    !Array.isArray(value.cases) ||
    value.cases.length !== 5 ||
    value.cases.some((c) => !c || typeof c !== 'object') ||
    new Set(value.cases.map((c) => c.id)).size !== 5 ||
    !['normal', 'error', 'long', 'empty', 'missing'].every((id) =>
      value.cases.some((c) => c.id === id),
    ) ||
    value.cases.some(
      (c) =>
        typeof c.url !== 'string' ||
        !c.url.startsWith('/') ||
        c.url.startsWith('//') ||
        (c.prepare !== undefined && typeof c.prepare !== 'function'),
    )
  )
    throw new Error(
      'QA_WEBSITE_INTEGRATION_REQUIRED: declare five real project website states in preview.websiteQa.',
    );
  return value;
}

export interface BrowserQaOptions {
  websiteQa: WebsiteQa;
  connection: PreviewConnection;
  manifest: ProjectManifest;
  catalog: RegistryCatalog;
  typography?: unknown;
  typographyEvidenceDirectory?: string;
  affectedTokenIds?: string[];
  onProgress?: (value: {
    completed: number;
    total: number;
    current: string;
  }) => void;
}
/** Fixed program, no command/path/code supplied by the client. Every PASS has executed evidence. */
export async function browserQa(
  options: BrowserQaOptions,
  config: EditableTokenConfig,
  context: QualityContext,
  level: QualityRun['level'],
): Promise<QualityEvidence[]> {
  const common = {
    configurationDigest: context.configurationDigest,
    sourceRevision: context.sourceRevision,
    environment: context.environment,
  };
  const checks: QualityEvidence[] = [];
  function record(
    ruleId: string,
    status: QualityEvidence['status'],
    description: string,
    evidence: string[],
    target = 'Working Draft',
  ) {
    checks.push({
      ...common,
      id: randomUUID(),
      ruleId,
      status,
      severity: 'blocker',
      target,
      description,
      evidence,
    });
  }
  const live = liveAudit(options.manifest, config, context);
  record(
    'WDF-TOKENS',
    live.every((f) => f.status === 'PASS') ? 'PASS' : 'FAIL',
    'Contract és Foundation tokenvalidáció',
    live.flatMap((f) => f.evidence),
  );
  const catalog = options.catalog;
  record(
    'WDF-REGISTRY',
    catalog.entries.length > 0 && catalog.diagnostics.length === 0
      ? 'PASS'
      : 'FAIL',
    'A regisztrált komponensek és fixture-ök feloldása',
    [
      JSON.stringify({
        entries: catalog.entries.map((e) => ({
          id: e.id,
          fixtures: e.fixtures,
        })),
        diagnostics: catalog.diagnostics,
      }),
    ],
  );
  if (live.some((f) => f.status !== 'PASS')) {
    for (const rule of [
      'WDF-BROWSER-MATRIX',
      'STD-A11Y-001',
      'STD-KEYBOARD-001',
      'WDF-GEOMETRY',
      'WDF-TYPE-001',
    ])
      record(
        rule,
        'NOT_RUN',
        'Érvénytelen tokenkonfiguráció miatt nem futott.',
        ['Előbb javítsd a Live Validation hibáit.'],
      );
    return checks;
  }
  const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--disable-gpu', '--disable-partial-raster'],
  });
  let timedOut = false;
  // The full matrix includes 160 real renders with axe and keyboard checks.
  // Shared CI runners need a larger budget than a local desktop; individual
  // preview/control waits remain bounded, as does the complete run.
  const deadline = setTimeout(() => {
    timedOut = true;
    void browser.close();
  }, 600000);
  const contextOptions = {
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
    viewport: { width: 1960, height: 1200 },
  } as const;

  const browserEvidence: string[] = [
    `Chromium ${browser.version()}; hu-HU; Europe/Budapest; reduced-motion; ${level}`,
  ];
  const geometries: string[] = [],
    accessibility: string[] = [],
    keyboard: string[] = [];
  let renderFailed = false,
    geometryFailed = false,
    a11yFailed = false,
    keyboardFailed = false;
  let renderTarget = 'Working Draft',
    geometryTarget = 'Working Draft',
    a11yTarget = 'Working Draft',
    keyboardTarget = 'Working Draft';

  try {
    const widths =
      options.manifest.preview.availability === 'configured'
        ? options.manifest.preview.widths
        : [];
    const typography = new TypographyProbe(
      options.typography,
      config,
      catalog,
      options.connection,
      options.typographyEvidenceDirectory ?? '.wdf-lab/evidence',
      widths,
    );
    const affected = options.affectedTokenIds ?? [];
    const entries =
      level === 'approval' ||
      !affected.length ||
      affected.some((id) => config.tokens[id]?.scope.kind === 'global')
        ? catalog.entries
        : catalog.entries.filter(
            (e) =>
              typography.components.includes(e.id) ||
              [
                ...e.tokens.family,
                ...Object.values(e.tokens.variants).flat(),
              ].some((id) => affected.includes(id)),
          );
    const cases = entries.flatMap((entry) =>
      entry.fixtures.map((f) => ({
        component: entry.id,
        fixture: f.id,
        variant: f.variant,
        state: f.state,
        url: `/__wdf/studio?component=${encodeURIComponent(entry.id)}&fixture=${encodeURIComponent(f.id)}`,
      })),
    );
    const websiteQa = validateWebsiteQa(options.websiteQa);
    const allCases = [
      ...websiteQa.cases.map((c) => ({
        component: 'website',
        fixture: c.id,
        variant: 'page',
        state: c.id,
        url: c.url,
        prepare: c.prepare,
      })),
      ...cases.map((c) => ({ ...c, prepare: undefined })),
    ];
    const tasks = widths.flatMap((width) =>
      allCases.map((testCase) => ({ width, testCase })),
    );
    let index = 0;
    let completed = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        const browserContext = await browser.newContext(contextOptions);
        const page = await browserContext.newPage();
        page.setDefaultTimeout(10000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(options.connection.labOrigin + '/__wdf/qa');
        while (index < tasks.length) {
          const { width, testCase } = tasks[index++]!;
          const target = `${testCase.component}/${testCase.fixture}/${width}`;
          options.onProgress?.({
            completed,
            total: tasks.length,
            current: `${target} · render`,
          });
          const errorCount = errors.length;
          await page.evaluate(
            ({ url, width, envelope, edits }) =>
              new Promise<void>((resolve, reject) => {
                document.querySelector('iframe')?.remove();
                const frame = document.createElement('iframe');
                frame.title = 'QA projekt előnézet';
                frame.style.cssText = `border:0;width:${width}px;height:900px;display:block`;
                const cleanup = () => {
                  clearInterval(timer);
                  clearTimeout(deadline);
                  window.removeEventListener('message', receive);
                };
                let applying = false;
                const receive = (event: MessageEvent) => {
                  if (
                    event.source !== frame.contentWindow ||
                    event.origin !== new URL(url).origin ||
                    event.data?.session !== envelope.session ||
                    event.data?.projectId !== envelope.projectId ||
                    event.data?.version !== envelope.version
                  )
                    return;
                  if (event.data.type === 'ready' && !applying) {
                    applying = true;
                    frame.contentWindow?.postMessage(
                      {
                        ...envelope,
                        type: 'apply-design',
                        revision: event.data.revision + 1,
                        edits,
                      },
                      new URL(url).origin,
                    );
                  }
                  if (event.data.type === 'applied') {
                    cleanup();
                    resolve();
                  }
                  if (event.data.type === 'error') {
                    cleanup();
                    reject(
                      new Error(`${event.data.code}: ${event.data.message}`),
                    );
                  }
                };
                const connect = () => {
                  if (!applying)
                    frame.contentWindow?.postMessage(
                      { ...envelope, type: 'connect' },
                      new URL(url).origin,
                    );
                };
                const timer = setInterval(connect, 250);
                const deadline = setTimeout(() => {
                  cleanup();
                  reject(new Error('QA_PREVIEW_ACK_TIMEOUT'));
                }, 15000);
                window.addEventListener('message', receive);
                frame.onload = connect;
                frame.src = url;
                document.querySelector('main')!.append(frame);
              }),
            {
              url: options.connection.previewOrigin + testCase.url,
              width,
              envelope: previewEnvelope(options.connection),
              edits: designEdits(config, registryTokenIds(catalog)),
            },
          );
          const frame = page
            .frames()
            .find((f) => f.url().startsWith(options.connection.previewOrigin))!;
          await frame
            .locator(
              testCase.component === 'website'
                ? websiteQa.readySelector
                : '.studio-specimen',
            )
            .first()
            .waitFor();
          await frame.evaluate(() => document.fonts.ready.then(() => {}));
          if (testCase.prepare) await testCase.prepare(frame, page, width);
          if (width === 390 && (await frame.locator('dialog[open]').count())) {
            await page.keyboard.press('Shift+Tab');
            await page.keyboard.press('Shift+Tab');
            const contained = await frame.evaluate(
              () => !!document.activeElement?.closest('dialog[open]'),
            );
            if (!contained) {
              keyboardFailed = true;
              keyboardTarget = testCase.component;
            }
            keyboard.push(`${target}: modal Tab containment=${contained}`);
          }
          const metrics = await frame.evaluate(
            ({ controls, cards }) => {
              const ids = [...document.querySelectorAll('[id]')].map(
                (e) => e.id,
              );
              const visible = (e: Element) => e.getClientRects().length > 0;
              return {
                width: innerWidth,
                duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
                overflow:
                  document.documentElement.scrollWidth >
                  document.documentElement.clientWidth,
                alerts: [...document.querySelectorAll('[role="alert"]')]
                  .filter(visible)
                  .map((e) => e.textContent),
                controls: [...document.querySelectorAll(controls)]
                  .filter(visible)
                  .map((e) => ({ height: e.getBoundingClientRect().height })),
                cards: cards.flatMap(({ selector, token }) =>
                  [...document.querySelectorAll(selector)]
                    .filter(visible)
                    .map((e) => ({
                      padding: parseFloat(getComputedStyle(e).paddingLeft),
                      token,
                    })),
                ),
                roles: [...document.querySelectorAll('h1,h2,p')]
                  .filter(visible)
                  .slice(0, 5)
                  .map((e) => ({
                    tag: e.tagName,
                    font: getComputedStyle(e).fontSize,
                    weight: getComputedStyle(e).fontWeight,
                  })),
              };
            },
            {
              controls: websiteQa.controls,
              cards: websiteQa.cards.map((c) => ({
                ...c,
                token: c.token.replace('{variant}', testCase.variant),
              })),
            },
          );
          const expected = resolveTokens(config);
          const resolved = expected.ok
            ? [
                expected.value.base,
                ...expected.value.responsive
                  .filter((r) => r.minWidth <= width)
                  .map((r) => r.tokens),
              ].at(-1)!
            : {};
          const registration = catalog.entries.find(
            (entry) => entry.id === testCase.component,
          );
          const paddingTokens = registration
            ? [
                ...registration.tokens.family,
                ...(registration.tokens.variants[testCase.variant] ?? []),
              ].filter((id) => config.tokens[id]?.role === 'card-padding')
            : [];
          const mappings = websiteQa.cards.map((rule) => ({
            ...rule,
            token: rule.token.replace('{variant}', testCase.variant),
          }));
          const unmapped = paddingTokens.filter(
            (id) => !mappings.some((rule) => rule.token === id),
          );
          const requiredRules = mappings.filter(
            (rule) =>
              paddingTokens.includes(rule.token) &&
              (!rule.fixtureStates ||
                rule.fixtureStates.includes(testCase.state)),
          );
          const invalidGeometry =
            unmapped.length > 0 ||
            requiredRules.some(
              (rule) =>
                !metrics.cards.some(
                  (measurement) => measurement.token === rule.token,
                ),
            ) ||
            metrics.width !== width ||
            metrics.duplicates.length > 0 ||
            metrics.overflow ||
            metrics.controls.some((c) => c.height < 44) ||
            metrics.cards.some(
              (c) => c.padding !== Number(resolved[c.token]?.value),
            );
          if (invalidGeometry) {
            geometryFailed = true;
            geometryTarget = testCase.component;
          }
          // Fixture alert/error states are intentional. Schema/render/runtime diagnostics are not.
          const invalidRender =
            metrics.alerts.some((t) =>
              /REGISTRY_|FIXTURE_|RENDER_|STUDIO_|props/.test(t ?? ''),
            ) || errors.length !== errorCount;
          if (invalidRender) {
            renderFailed = true;
            renderTarget = testCase.component;
          }
          browserEvidence.push(
            `${target}: ${invalidRender ? 'FAIL' : 'PASS'}; variant=${testCase.variant}; state=${testCase.state}; errors=${JSON.stringify(errors.slice(errorCount))}`,
          );
          geometries.push(
            `${target}: ${JSON.stringify(metrics)}; requiredCardTokens=${JSON.stringify(requiredRules.map((rule) => rule.token))}; unmapped=${JSON.stringify(unmapped)}`,
          );
          // Run scanner for each real rendered component, state and viewport.
          options.onProgress?.({
            completed,
            total: tasks.length,
            current: `${target} · axe`,
          });
          const axe = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          if (axe.violations.length) {
            a11yFailed = true;
            a11yTarget = testCase.component;
          }
          accessibility.push(
            `${target}: ${JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete.map((i) => i.id), passes: axe.passes.length })}`,
          );
          await typography.measure(
            frame,
            page,
            width,
            testCase.component,
            testCase.fixture,
          );
          if (width === 390) {
            const scope = (await frame.locator('dialog[open]').count())
              ? frame.locator('dialog[open]')
              : frame.locator('body');
            const control = scope
              .locator(
                'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]',
              )
              .filter({ visible: true })
              .first();
            if (await control.count()) {
              if (await frame.locator('dialog[open]').count())
                await control.focus();
              else await page.locator('iframe').focus();
              await page.keyboard.press('Tab');
              const focus = await frame.evaluate(() => {
                const e = document.activeElement as HTMLElement;
                const css = getComputedStyle(e);
                return {
                  tag: e.tagName,
                  visible: e.getClientRects().length > 0,
                  outline: css.outlineStyle,
                  width: css.outlineWidth,
                };
              });
              if (
                !focus.visible ||
                focus.tag === 'BODY' ||
                focus.outline === 'none' ||
                parseFloat(focus.width) === 0
              ) {
                keyboardFailed = true;
                keyboardTarget = testCase.component;
              }
              keyboard.push(`${target}: ${JSON.stringify(focus)}`);
            } else
              keyboard.push(
                `${target}: nincs engedélyezett interaktív vezérlő; statikus/disabled fixture`,
              );
          }
          completed++;
          options.onProgress?.({
            completed,
            total: tasks.length,
            current: target,
          });
        }
      }),
    );
    const typographyReport = typography.finish();
    record(
      'WDF-TYPE-001',
      typographyReport.status,
      'R05: valódi fontszerepek, súlypárok és megőrzött nem igazolt értékek',
      [JSON.stringify(typographyReport)],
    );
    for (const evidence of [
      browserEvidence,
      geometries,
      accessibility,
      keyboard,
    ])
      evidence.sort();
    record(
      'WDF-BROWSER-MATRIX',
      renderFailed ? 'FAIL' : 'PASS',
      'Valódi Website és Registry fixture/variáns/állapot minden kötelező viewporton',
      browserEvidence,
      renderTarget,
    );
    record(
      'WDF-GEOMETRY',
      geometryFailed ? 'FAIL' : 'PASS',
      'Renderelt viewport, ismétlődő ID, overflow, 44 px vezérlő és kártyapadding',
      geometries,
      geometryTarget,
    );
    record(
      'STD-A11Y-001',
      a11yFailed ? 'FAIL' : 'PASS',
      'Automatikus WCAG szabályvizsgálat; nem teljes megfelelőségi tanúsítás',
      accessibility,
      a11yTarget,
    );
    record(
      'STD-KEYBOARD-001',
      keyboardFailed ? 'FAIL' : 'PASS',
      'Valódi Tab és látható fókusz a fixture-ökön',
      keyboard,
      keyboardTarget,
    );
  } catch (error) {
    if (timedOut)
      throw new Error(
        'QA_TIMEOUT: a 600 másodperces teljes futási határ lejárt.',
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(deadline);
    await browser.close();
  }
  return checks;
}
