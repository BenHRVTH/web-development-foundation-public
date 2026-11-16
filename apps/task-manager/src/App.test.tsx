import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { App } from './App';

test('M0-U01: the actual React entry component renders through the TypeScript/JSX toolchain', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('Feladataim</h1>');
  expect(html).toContain('Rajzold fel a fő felhasználói útvonalat');
  expect(html).toContain('href="#tartalom"');
  expect(html).toContain('id="tartalom"');
});
