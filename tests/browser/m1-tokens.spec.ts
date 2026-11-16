import { expect, test } from '@playwright/test';
import { unwrap } from '../../packages/core/src/diagnostics';
import { generateTokens } from '../../packages/core/src/generation';
import { SPACING_PX } from '@wdf/foundation';

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`M1-B${width}: generated application CSS and card preset geometry at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const bootstrap = page.locator('main');
    await expect(bootstrap).toHaveCSS(
      'padding-left',
      width >= 1024 ? '64px' : width >= 768 ? '40px' : '24px',
    );
    await expect(bootstrap).toHaveCSS('padding-top', '40px');
    await expect(bootstrap).toHaveCSS('color', 'rgb(37, 34, 55)');
    await expect(page.locator('h1')).toHaveCSS(
      'font-size',
      width >= 768 ? '48px' : '32px',
    );
    const actual = await page.evaluate(
      (scale) =>
        Object.fromEntries(
          scale.map((px) => [
            px,
            getComputedStyle(document.documentElement)
              .getPropertyValue(`--wdf-foundation--spacing--${px}`)
              .trim(),
          ]),
        ),
      [...SPACING_PX],
    );
    for (const px of SPACING_PX) {
      expect(actual[px]).toMatch(/rem$/);
      expect(Number.parseFloat(actual[px] ?? '')).toBe(px / 16);
    }
    await testInfo.attach('bootstrap-computed-style', {
      body: JSON.stringify({
        width,
        actual,
        paddingInline: width >= 1024 ? 64 : width >= 768 ? 40 : 24,
        paddingBlock: 40,
      }),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: testInfo.outputPath(`m1-bootstrap-${width}.png`),
      fullPage: true,
    });

    // Isolated test-only geometry fixture. No Registry, Studio or product card is implemented.
    for (const [preset, padding] of [
      ['compact', 16],
      ['comfortable', 24],
      ['spacious', 32],
    ] as const) {
      const generated = unwrap(
        generateTokens({
          schemaVersion: '1.0.0',
          tokens: {
            'component.probe.padding': {
              type: 'spacing',
              role: 'card-padding',
              scope: { kind: 'family', family: 'probe' },
              value: { ref: `foundation.card.${preset}` },
            },
          },
        }),
      );
      const style = await page.addStyleTag({ content: generated.css });
      const geometry = await page.evaluate(() => {
        const box = document.createElement('div');
        box.style.cssText = 'padding:var(--wdf-component--probe--padding);';
        const content = document.createElement('div');
        content.textContent = 'Geometry probe';
        box.append(content);
        document.body.append(box);
        const outer = box.getBoundingClientRect(),
          inner = content.getBoundingClientRect();
        const result = {
          top: inner.top - outer.top,
          left: inner.left - outer.left,
          right: outer.right - inner.right,
        };
        box.remove();
        return result;
      });
      expect(geometry).toEqual({ top: padding, left: padding, right: padding });
      await style.evaluate((node) => node.parentNode?.removeChild(node));
    }
    const responsive = unwrap(
      generateTokens({
        schemaVersion: '1.0.0',
        tokens: {
          'component.probe.padding': {
            type: 'spacing',
            role: 'card-padding',
            scope: { kind: 'family', family: 'probe' },
            value: { ref: 'foundation.card.spacious' },
          },
        },
        responsive: {
          tablet: {
            minWidth: 768,
            overrides: {
              'component.probe.padding': { ref: 'foundation.card.comfortable' },
            },
          },
        },
      }),
    );
    await page.addStyleTag({ content: responsive.css });
    const renderedPadding = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.padding = 'var(--wdf-component--probe--padding)';
      document.body.append(probe);
      const px = getComputedStyle(probe).paddingLeft;
      probe.remove();
      return px;
    });
    expect(renderedPadding).toBe(width >= 768 ? '24px' : '32px');
    await testInfo.attach('preset-and-responsive-geometry', {
      body: JSON.stringify({
        width,
        presets: { compact: 16, comfortable: 24, spacious: 32 },
        responsivePadding: renderedPadding,
      }),
      contentType: 'application/json',
    });
  });
}
