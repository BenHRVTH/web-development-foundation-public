import { expect, test } from '../lab-regression';
import { type Page, type Frame, type FrameLocator } from '@playwright/test';
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { longTask } from '../../apps/task-manager/src/tasks/model';

type Surface = Page | FrameLocator;
async function geometry(frame: Page | Frame) {
  return frame.evaluate(() => {
    const bounds = (selector: string) =>
      [...document.querySelectorAll(selector)].map((el) => {
        const r = el.getBoundingClientRect();
        const css = getComputedStyle(el);
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          padding: css.padding,
          font: css.font,
          color: css.color,
          background: css.backgroundColor,
          borderRadius: css.borderRadius,
        };
      });
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
      headings: bounds('h1,h2'),
      cards: bounds('.task-card,.task-detail'),
      controls: bounds('button,input,select,textarea'),
      dialog: bounds('dialog[open]'),
      inset: [...document.querySelectorAll('.task-card,.task-detail')].map(
        (el) => parseFloat(getComputedStyle(el).paddingLeft),
      ),
    };
  });
}
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`R01: exact rendered application outside/inside Lab at ${width}px in five states`, async ({
    page,
    context,
    browser,
  }, info) => {
    await page.setViewportSize({ width: 1960, height: 1400 });
    await page.goto('/');
    // A cold Vite preview can finish booting after Playwright's default 5 s.
    // Wait for the actual design ACK; pixel thresholds and app deadlines stay unchanged.
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
      timeout: 15000,
    });
    await page
      .getByRole('button', { name: `${width} CSS px`, exact: true })
      .click();
    const preview = page.frameLocator('iframe');
    const frame = page
      .frames()
      .find((f) => f.url().startsWith('http://127.0.0.1:5176'))!;
    const standalone = await context.newPage();
    await standalone.setViewportSize({ width, height: 900 });
    await standalone.goto('http://127.0.0.1:5173');
    const surfaces: Surface[] = [standalone, preview];
    const results: unknown[] = [];
    await mkdir('test-results/m3', { recursive: true });
    async function compare(state: string) {
      await Promise.all([
        standalone.evaluate(() => document.fonts.ready.then(() => {})),
        frame.evaluate(() => document.fonts.ready.then(() => {})),
      ]);
      const outside = await geometry(standalone),
        inside = await geometry(frame);
      expect(inside).toEqual(outside);
      expect(inside.width).toBe(width);
      expect(inside.height).toBe(900);
      expect(inside.scrollWidth).toBeLessThanOrEqual(inside.clientWidth);
      expect(inside.duplicateIds).toEqual([]);
      for (const inset of inside.inset)
        expect(inset).toBe(state === 'long' ? 32 : 24);
      const prefix = `docs/reports/evidence/m3/r01-${width}-${state}`;
      const a = await standalone.screenshot({
        path: prefix + '-outside.png',
        animations: 'disabled',
        caret: 'hide',
      });
      const b = await page.locator('iframe').screenshot({
        path: prefix + '-inside.png',
        animations: 'disabled',
        caret: 'hide',
      });
      const imageA = PNG.sync.read(a),
        imageB = PNG.sync.read(b);
      expect([imageB.width, imageB.height]).toEqual([
        imageA.width,
        imageA.height,
      ]);
      let differingPixels = 0;
      let maximumChannelDelta = 0;
      const pixelSamples: unknown[] = [];
      for (let i = 0; i < imageA.data.length; i += 4) {
        if (
          imageA.data
            .subarray(i, i + 4)
            .compare(imageB.data.subarray(i, i + 4)) !== 0
        ) {
          differingPixels++;
          if (pixelSamples.length < 64)
            pixelSamples.push({
              x: (i / 4) % imageA.width,
              y: Math.floor(i / 4 / imageA.width),
              outside: [...imageA.data.subarray(i, i + 4)],
              inside: [...imageB.data.subarray(i, i + 4)],
            });
        }
        for (let c = 0; c < 4; c++)
          maximumChannelDelta = Math.max(
            maximumChannelDelta,
            Math.abs(imageA.data[i + c]! - imageB.data[i + c]!),
          );
      }
      results.push({
        state,
        width,
        height: 900,
        differingPixels,
        maximumChannelDelta,
        tolerance: { maximumDifferingPixels: 8, maximumChannelDelta: 1 },
        geometry: inside,
      });
      // Persist before asserting: a failed state must retain its measured result.
      await writeFile(
        `test-results/m3/r01-${width}.json`,
        JSON.stringify(results, null, 2) + '\n',
      );
      if (maximumChannelDelta > 1 || differingPixels > 8) {
        for (const [name, body] of [
          ['outside', a],
          ['inside', b],
        ] as const)
          await info.attach(`R01-${state}-${name}`, {
            body,
            contentType: 'image/png',
          });
        const rendering = await Promise.all(
          [standalone, frame].map((surface) =>
            surface.evaluate(() => ({
              fonts: document.fonts.status,
              animations: document.getAnimations().map((a) => a.playState),
              devicePixelRatio,
              scroll: { x: scrollX, y: scrollY },
              svg: [...document.querySelectorAll('svg')].map((svg) => ({
                bounds: svg.getBoundingClientRect().toJSON(),
                markup: svg.outerHTML,
              })),
            })),
          ),
        );
        await info.attach('R01-rendering-diagnostics', {
          body: JSON.stringify({
            state,
            width,
            browserVersion: browser.version(),
            iframe: await page.locator('iframe').boundingBox(),
            rendering,
            differingPixels,
            maximumChannelDelta,
            pixelSamples,
          }),
          contentType: 'application/json',
        });
      }
      // Chromium rounds a few clipped/curved-edge pixels by one channel level in nested compositing.
      // No masks, alignment transforms, content changes or geometric tolerance are permitted.
      expect(
        maximumChannelDelta,
        `${state}: at most one of 255 channel levels`,
      ).toBeLessThanOrEqual(1);
      expect(
        differingPixels,
        `${state}: at most eight raster rounding pixels`,
      ).toBeLessThanOrEqual(8);
    }
    await expect(preview.getByRole('article')).toHaveCount(6);
    await compare('normal');
    for (const surface of surfaces) {
      await surface
        .getByRole('button', { name: 'Új feladat', exact: true })
        .click();
      await surface
        .getByRole('dialog')
        .getByRole('button', { name: 'Feladat létrehozása' })
        .click();
    }
    await compare('error');
    for (const surface of surfaces) {
      const dialog = surface.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: /Feladat neve/ })
        .fill(longTask.title);
      await dialog
        .getByRole('textbox', { name: 'Leírás', exact: true })
        .fill(longTask.description);
      await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
      await surface
        .getByRole('link', { name: longTask.title, exact: true })
        .click();
      await expect(surface.locator('.task-detail')).toContainText(
        longTask.description,
      );
    }
    await compare('long');
    for (const surface of surfaces) {
      await surface
        .getByRole('link', { name: 'Vissza a feladatokhoz' })
        .click();
      await surface
        .getByRole('combobox', { name: 'Állapot' })
        .selectOption('open');
      while (await surface.getByRole('checkbox').count())
        await surface.getByRole('checkbox').first().click();
      await expect(
        surface.getByRole('heading', { name: 'Minden feladat elkészült' }),
      ).toBeVisible();
    }
    await compare('empty');
    await standalone.goto('http://127.0.0.1:5173/#tasks/missing');
    await frame.goto('http://127.0.0.1:5176/#tasks/missing');
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
      timeout: 15000,
    });
    for (const surface of surfaces)
      await expect(surface.getByRole('alert')).toContainText(
        'A feladat nem található',
      );
    await compare('missing');
    await info.attach('R01-pixel-and-geometry', {
      body: JSON.stringify(results),
      contentType: 'application/json',
    });
    await standalone.close();
  });
}
