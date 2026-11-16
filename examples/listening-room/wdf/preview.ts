import typography from './typography.json';
import { previewDefinition } from '@wdf/adapter-react/preview';
import type { WebsiteQa } from '@wdf/qa/browser';
const websiteQa = {
  readySelector: 'h1',
  controls: '.action,.field input',
  cards: ['compact', 'comfortable', 'spacious'].map((v) => ({
    selector: `.session-${v}`,
    token: `component.session-card.${v}.padding`,
  })),
  cases: ['normal', 'error', 'long', 'empty', 'missing'].map((id) => ({
    id: id as 'normal' | 'error' | 'long' | 'empty' | 'missing',
    url: `/?state=${id}`,
  })),
} satisfies WebsiteQa;
export default {
  ...previewDefinition,
  studioStyles: ['/src/app.css'],
  websiteQa,
  typography,
};
