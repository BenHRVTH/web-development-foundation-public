import { test as base, expect } from '@playwright/test';
import type { ChangeView } from '@wdf/core/change';
/** M5 persists edits: regressions now use actual Undo to restore the single Draft between tests. */
export const test = base.extend<{ restoreDraft: void }>({
  restoreDraft: [
    async ({ request }, use) => {
      const module = await (
        await request.get('/@id/__x00__virtual:wdf-project')
      ).text();
      const data = JSON.parse(
        module.match(/export default (\{[^\n]+\});/)![1]!,
      );
      const headers = {
        'X-WDF-Session': data.connection.session,
        Origin: data.connection.labOrigin,
      };
      let view: ChangeView = await (
        await request.get('/__wdf/state', { headers })
      ).json();
      while (view.state.cursor) {
        const response = await request.post('/__wdf/change', {
          headers,
          data: {
            version: '1.0.0',
            projectId: data.connection.projectId,
            session: data.connection.session,
            requestId: crypto.randomUUID(),
            expectedRevision: view.state.revision,
            operation: { type: 'undo' },
          },
        });
        expect(response.ok()).toBe(true);
        view = await response.json();
      }
      await use();
    },
    { auto: true },
  ],
});
export { expect };
