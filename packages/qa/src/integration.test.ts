import { test, expect } from 'vitest';
import { validateWebsiteQa, type WebsiteQa } from './browser.ts';
const integration: WebsiteQa = {
  readySelector: 'h1',
  controls: 'button,input',
  cards: [{ selector: '.card', token: 'component.card.spacious.padding' }],
  cases: ['normal', 'error', 'long', 'empty', 'missing'].map((id) => ({
    id: id as WebsiteQa['cases'][number]['id'],
    url: `/?state=${id}`,
  })),
};
test('M6 project QA preserves all five explicit real website state declarations', () => {
  expect(validateWebsiteQa(integration)).toBe(integration);
});
test.each([
  undefined,
  {},
  { ...integration, cases: [] },
  {
    ...integration,
    cases: [...integration.cases.slice(1), integration.cases[1]],
  },
  { ...integration, cases: [null, ...integration.cases.slice(1)] },
  {
    ...integration,
    cases: integration.cases.map((c) => ({
      ...c,
      url: 'https://external.invalid/',
    })),
  },
  {
    ...integration,
    cases: integration.cases.map((c) => ({ ...c, url: '//external.invalid/' })),
  },
  { ...integration, cards: [null] },
])(
  'M6 missing or malformed project QA cannot become a successful empty matrix (%j)',
  (value) => {
    expect(() => validateWebsiteQa(value)).toThrow(
      'QA_WEBSITE_INTEGRATION_REQUIRED',
    );
  },
);
