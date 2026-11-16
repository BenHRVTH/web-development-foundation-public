import typography from './typography.json';
import { previewDefinition } from '@wdf/adapter-react/preview';
import { websiteQa } from './qa';
export default {
  ...previewDefinition,
  studioStyles: ['/src/app.css'],
  websiteQa,
  typography,
};
