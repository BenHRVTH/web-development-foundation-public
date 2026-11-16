import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/integration/m5-portable-storage.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ['default', 'json'],
    outputFile: { json: 'test-results/m5-portable-storage.json' },
  },
});
