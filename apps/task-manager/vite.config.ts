import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: { license: { fileName: 'THIRD-PARTY-LICENSES.md' } },
  plugins: [
    react(),
    {
      name: 'standalone-app-boundary',
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (
            /\/packages\/(core|adapter-react|ui-lab|qa)\//.test(id) ||
            /\/tests\/fixtures\//.test(id) ||
            /\/wdf\/registry\./.test(id)
          ) {
            this.error(
              `Development-only module entered the production app: ${id}`,
            );
          }
        }
      },
    },
  ],
});
