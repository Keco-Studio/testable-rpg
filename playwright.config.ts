import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 800, height: 600 },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'visual', testMatch: /visual\/.*\.spec\.ts/ },
    { name: 'integration', testMatch: /integration\/.*\.spec\.ts/ },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/ },
  ],
});
