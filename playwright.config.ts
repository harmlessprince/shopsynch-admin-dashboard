import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3019',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'NUXT_PUBLIC_API_TEST_BASE_URL=http://localhost:3019 NUXT_PUBLIC_API_LIVE_BASE_URL=http://localhost:3019 npx nuxt dev --port 3019',
    url: 'http://localhost:3019',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
