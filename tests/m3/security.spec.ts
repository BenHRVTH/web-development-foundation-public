import { expect, test } from '../lab-regression';

test('M3-P03: real preview rejects malformed/forbidden, stale, wrong sender/origin/session/project messages', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  const result = await page.evaluate(async () => {
    const entry = '/@id/__x00__virtual:wdf-project';
    const project = (await import(/* @vite-ignore */ entry)).default;
    const { connection } = project;
    const target = document.querySelector('iframe')!.contentWindow!;
    const envelope = {
      channel: 'wdf-preview',
      version: '1.1.0',
      projectId: connection.projectId,
      session: connection.session,
    };
    const replies: { type: string; code?: string }[] = [];
    return await new Promise<{ types: string[]; codes: string[] }>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', receive);
          reject(new Error('No protocol barrier pong'));
        }, 5000);
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
            resolve({
              types: replies.map((r) => r.type),
              codes: replies.flatMap((r) => (r.code ? [r.code] : [])),
            });
          }
        }
        window.addEventListener('message', receive);
        for (const data of [
          { ...envelope, type: 'execute', code: 'window.compromised = true' },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [],
            css: 'body{display:none}',
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'primitive.color.accent', value: '#ffffff' }],
            version: '2.0.0',
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'primitive.color.accent', value: '#ffffff' }],
            session: 'b'.repeat(64),
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'primitive.color.accent', value: '#ffffff' }],
            projectId: 'other',
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'foundation.spacing.16', value: 19 }],
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'component.button.radius', value: 19 }],
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'semantic.space.page', value: 19 }],
          },
          {
            ...envelope,
            type: 'apply',
            revision: 100,
            edits: [{ id: 'primitive.color.accent', value: 'tomato' }],
          },
          { ...envelope, type: 'apply', revision: 1, edits: [] },
        ])
          target.postMessage(data, connection.previewOrigin);
        target.postMessage(
          { ...envelope, type: 'ping' },
          connection.previewOrigin,
        );
      },
    );
  });
  expect(
    result.codes.filter((c) => c === 'PREVIEW_TOKENS_INVALID'),
  ).toHaveLength(4);
  expect(result.codes).toContain('PREVIEW_REVISION_STALE');
  expect(result.types).not.toContain('applied');
  const preview = page
    .frames()
    .find((f) => f.url().startsWith('http://127.0.0.1:5176'))!;
  await preview.evaluate(async () => {
    // An attacker in a sibling window cannot provide the exact parent source/origin.
    const moduleUrl = '/@id/__x00__virtual:wdf-preview-bridge';
    const response = await fetch(moduleUrl);
    const source = await response.text();
    const session = source.match(/"session":"([a-f0-9]{64})"/)?.[1];
    const data = {
      channel: 'wdf-preview',
      version: '1.1.0',
      projectId: 'task-manager',
      session,
      type: 'apply',
      revision: 500,
      edits: [{ id: 'primitive.color.accent', value: '#ffffff' }],
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
    page.frameLocator('iframe').locator('.button--primary').first(),
  ).toHaveCSS('background-color', 'rgb(91, 60, 180)');
  expect(
    await preview.evaluate(() => Object.hasOwn(window, 'compromised')),
  ).toBe(false);
  // Current UI session still writes successfully after every rejected attack.
  await page
    .locator('[data-token="primitive.color.accent"] input:not([type="color"])')
    .fill('#123456');
  await expect(
    page.frameLocator('iframe').locator('.button--primary').first(),
  ).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});

test('M3-P04: local HTTP servers reject mutation, cross-origin and hostile Host requests', async ({
  request,
}) => {
  for (const origin of ['http://127.0.0.1:5175', 'http://127.0.0.1:5176']) {
    expect(
      (
        await request.post(origin + '/wdf/tokens.json', {
          data: { value: 'bad' },
        })
      ).status(),
    ).toBe(403);
    expect((await request.delete(origin + '/src/main.tsx')).status()).toBe(403);
    expect(
      (
        await request.get(origin, {
          headers: { Origin: 'https://attacker.test' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(origin, { headers: { Host: 'attacker.test' } })
      ).status(),
    ).toBe(403);
    const response = await request.get(origin);
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
    expect(response.headers()['content-security-policy']).toContain(
      'frame-ancestors',
    );
  }
});

test('M3-P05: runtime errors have visible diagnostics and explicit reload recovery', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await page
    .frames()
    .find((f) => f.url().startsWith('http://127.0.0.1:5176'))!
    .evaluate(() =>
      window.dispatchEvent(
        new ErrorEvent('error', { message: 'isolated M3 runtime fixture' }),
      ),
    );
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('PREVIEW_RUNTIME_ERROR');
  await page
    .getByRole('button', { name: 'Előnézet újratöltése', exact: true })
    .click();
  await page.getByRole('button', { name: 'Újratöltés', exact: true }).click();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
});

test('M3-P06: an application boot failure before handshake never becomes a ready preview', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:5176/src/main.tsx', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "throw new Error('M3_BOOT_FAILURE');",
    }),
  );
  await page.goto('/');
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('PREVIEW_RUNTIME_ERROR');
  await expect(page.locator('.preview-status')).toHaveText('Előnézeti hiba');
  await expect(page.frameLocator('iframe').getByRole('article')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Újracsatlakozás', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('PREVIEW_RUNTIME_ERROR');
  await page.unroute('http://127.0.0.1:5176/src/main.tsx');
  await page
    .getByRole('button', { name: 'Előnézet újratöltése', exact: true })
    .click();
  await page.getByRole('button', { name: 'Újratöltés', exact: true }).click();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await expect(page.frameLocator('iframe').getByRole('article')).toHaveCount(6);
});
