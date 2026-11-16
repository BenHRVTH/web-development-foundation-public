import { expect, test } from '../lab-regression';
test('M4-P02: both preview frames reject forged scope, forbidden Foundation, malformed snapshots, stale revisions and sibling sender', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await expect(page.locator('main:visible .preview-status')).toHaveText(
    'Élő kapcsolat',
  );
  const results = await page.evaluate(async () => {
    const moduleUrl = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ moduleUrl)).default;
    const envelope = {
      channel: 'wdf-preview',
      version: '1.1.0',
      projectId: connection.projectId,
      session: connection.session,
    };
    const results = [];
    for (const id of ['website-preview', 'studio-preview']) {
      const target = (document.getElementById(id) as HTMLIFrameElement)
        .contentWindow!;
      const replies: { type: string; code?: string }[] = [];
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Missing security barrier')),
          5000,
        );
        function receive(event: MessageEvent) {
          if (
            event.source !== target ||
            event.origin !== connection.previewOrigin
          )
            return;
          replies.push(event.data);
          if (event.data.type === 'pong') {
            clearTimeout(timeout);
            window.removeEventListener('message', receive);
            resolve();
          }
        }
        window.addEventListener('message', receive);
        const valid = {
          id: 'component.button.radius',
          scope: { kind: 'family', family: 'button' },
          value: 24,
        };
        for (const edits of [
          [{ ...valid, scope: { kind: 'global' } }],
          [{ ...valid, scope: { kind: 'family', family: 'select' } }],
          [{ ...valid, id: 'foundation.spacing.16' }],
          [{ ...valid, value: { ref: 'missing.token' } }],
          [valid, { ...valid, value: 32 }],
          [
            valid,
            { id: 'semantic.space.page', scope: { kind: 'global' }, value: 19 },
          ],
          [
            {
              ...valid,
              id: 'component.button.primary.background',
              scope: { kind: 'variant', family: 'button', variant: 'quiet' },
              value: '#123456',
            },
          ],
        ])
          target.postMessage(
            { ...envelope, type: 'apply-design', revision: 100, edits },
            connection.previewOrigin,
          );
        for (const patch of [
          { version: '1.0.0' },
          { projectId: 'foreign' },
          { session: 'b'.repeat(64) },
          { css: 'body{display:none}' },
          { edits: [{ ...valid, scope: { kind: 'instance', id: 'x' } }] },
          { edits: [{ ...valid, source: '() => null' }] },
        ])
          target.postMessage(
            {
              ...envelope,
              type: 'apply-design',
              revision: 100,
              edits: [valid],
              ...patch,
            },
            connection.previewOrigin,
          );
        target.postMessage(
          { ...envelope, type: 'apply-design', revision: 1, edits: [valid] },
          connection.previewOrigin,
        );
        target.postMessage(
          { ...envelope, type: 'ping' },
          connection.previewOrigin,
        );
      });
      results.push({
        id,
        codes: replies.flatMap((r) => (r.code ? [r.code] : [])),
        types: replies.map((r) => r.type),
      });
    }
    return results;
  });
  for (const result of results) {
    expect(
      result.codes.filter((c) => c === 'PREVIEW_TOKENS_INVALID'),
    ).toHaveLength(7);
    expect(result.codes).toContain('PREVIEW_REVISION_STALE');
    expect(result.types).not.toContain('applied');
  }
  for (const frameId of ['website-preview', 'studio-preview']) {
    const frame = page.frameLocator(`#${frameId}`);
    await expect(frame.locator('.button--primary').first()).toHaveCSS(
      'border-radius',
      '8px',
    );
    await expect(frame.locator('.button--primary').first()).toHaveCSS(
      'background-color',
      'rgb(91, 60, 180)',
    );
  }
  const studioFrame = page
    .frames()
    .find((f) => f.url().includes('/__wdf/studio'))!;
  await studioFrame.evaluate(async () => {
    const source = await (
      await fetch('/@id/__x00__virtual:wdf-preview-bridge')
    ).text();
    const session = source.match(/"session":"([a-f0-9]{64})"/)?.[1];
    const data = {
      channel: 'wdf-preview',
      version: '1.1.0',
      projectId: 'task-manager',
      session,
      type: 'apply-design',
      revision: 500,
      edits: [
        {
          id: 'component.button.radius',
          scope: { kind: 'family', family: 'button' },
          value: 40,
        },
      ],
    };
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://attacker.test',
        source: parent,
        data,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://127.0.0.1:5175',
        source: window,
        data,
      }),
    );
  });
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('border-radius', '8px');
  await page
    .getByLabel('component.button.radius érték módja')
    .selectOption('value');
  await page.locator('[data-token="component.button.radius"] input').fill('16');
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('border-radius', '16px');
  await page.getByRole('button', { name: 'Website View', exact: true }).click();
  await expect(
    page.frameLocator('#website-preview').locator('.button--primary').first(),
  ).toHaveCSS('border-radius', '16px');
});

test('M4-P04: legacy global apply preserves component scopes; unexpected revision is explicit and reconnect recovers', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await expect(page.locator('main:visible .preview-status')).toHaveText(
    'Élő kapcsolat',
  );
  await page
    .getByLabel('component.button.radius érték módja')
    .selectOption('value');
  await page.locator('[data-token="component.button.radius"] input').fill('16');
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('border-radius', '16px');
  await page.evaluate(async () => {
    const url = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ url)).default;
    const target = (
      document.getElementById('studio-preview') as HTMLIFrameElement
    ).contentWindow!;
    target.postMessage(
      {
        channel: 'wdf-preview',
        version: '1.1.0',
        projectId: connection.projectId,
        session: connection.session,
        type: 'apply',
        revision: 100,
        edits: [{ id: 'primitive.color.accent', value: '#123456' }],
      },
      connection.previewOrigin,
    );
  });
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('border-radius', '16px');
  await page.locator('[data-token="component.button.radius"] input').fill('20');
  await expect(page.locator('main:visible').getByRole('alert')).toContainText(
    'PREVIEW_REVISION_STALE',
  );
  await page
    .getByRole('button', { name: 'Újracsatlakozás', exact: true })
    .click();
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('border-radius', '20px');
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toHaveCSS('background-color', 'rgb(91, 60, 180)');
});

test('M4-N04: failed application module loading cannot acknowledge a healthy Website; Studio stays usable', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:5176/src/main.tsx', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/javascript',
      body: '',
    }),
  );
  await page.goto('/');
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('PREVIEW_RUNTIME_ERROR');
  await expect(page.locator('.preview-status')).toHaveText('Előnézeti hiba');
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await expect(page.locator('main:visible .preview-status')).toHaveText(
    'Élő kapcsolat',
  );
  await expect(
    page.frameLocator('#studio-preview').locator('.button--primary'),
  ).toBeVisible();
  await expect(page.locator('main:visible').getByRole('alert')).toContainText(
    'Website View:',
  );
});
