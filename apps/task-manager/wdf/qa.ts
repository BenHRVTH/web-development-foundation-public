import type { WebsiteQa } from '@wdf/qa/browser';
import type { Frame } from '@playwright/test';
export const websiteQa = {
  readySelector: 'h1',
  controls: '.button,.text-input,.select',
  cards: [
    ...['compact', 'comfortable', 'spacious'].map((v) => ({
      selector: '.task-card--' + v,
      token: 'component.task-card.' + v + '.padding',
    })),
    { selector: '.task-detail', token: 'component.task-card.spacious.padding' },
    {
      selector: '.dialog__body',
      token: 'component.dialog.modal.padding',
      fixtureStates: ['open', 'long'],
    },
  ],
  cases: ['normal', 'error', 'long', 'empty', 'missing'].map((id) => ({
    id: id as 'normal' | 'error' | 'long' | 'empty' | 'missing',
    url: id === 'missing' ? '/#tasks/missing' : '/',
    async prepare(frame: Frame) {
      if (['error', 'long'].includes(id)) {
        await frame
          .getByRole('button', { name: 'Új feladat', exact: true })
          .click();
        const dialog = frame.getByRole('dialog');
        await dialog
          .getByRole('button', { name: 'Feladat létrehozása', exact: true })
          .click();
        await dialog.locator('[aria-invalid="true"]').first().waitFor();
        if (id === 'long') {
          const title = 'QA hosszú feladat – Árvíztűrő tükörfúrógép '
            .repeat(3)
            .trim();
          await dialog
            .getByRole('textbox', { name: /Feladat neve/ })
            .fill(title);
          await dialog
            .getByRole('textbox', { name: 'Leírás', exact: true })
            .fill(
              'Hosszú leírás, magyar karakterek, ellenőrzött tördelés. '.repeat(
                15,
              ),
            );
          await dialog
            .getByRole('button', { name: 'Feladat létrehozása', exact: true })
            .click();
          await frame.getByRole('link', { name: title, exact: true }).click();
          await frame.locator('.task-detail').waitFor();
        }
      }
      if (id === 'empty') {
        await frame
          .getByRole('combobox', { name: 'Állapot', exact: true })
          .selectOption('open');
        while (await frame.getByRole('checkbox').count())
          await frame.getByRole('checkbox').first().click();
        await frame
          .getByRole('heading', { name: 'Minden feladat elkészült' })
          .waitFor();
      }
      if (id === 'missing')
        await frame
          .getByRole('alert')
          .filter({ hasText: 'A feladat nem található' })
          .waitFor();
    },
  })),
} satisfies WebsiteQa;
