import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      'apps/**/*.test.{ts,tsx}',
      'packages/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    environment: 'node',
    // Match the existing portable-storage budget for real fsync/process tests on shared CI.
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ['default', 'json'],
    outputFile: { json: 'test-results/unit.json' },
  },
});
