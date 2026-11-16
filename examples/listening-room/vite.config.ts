import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  build: { license: { fileName: 'THIRD-PARTY-LICENSES.md' } },
  plugins: [
    react(),
    {
      name: 'production-boundary',
      generateBundle() {
        for (const id of this.getModuleIds())
          if (/@wdf|[\\/]wdf[\\/]registry/.test(id))
            this.error(`Development module in production: ${id}`);
      },
    },
  ],
});
