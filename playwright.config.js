import { defineConfig } from '@playwright/test';

process.env.SPORTSWEAR_TEST_DB ||= `sportswear_test_${process.pid}`;

export default defineConfig({
    testDir: './tests',
    testMatch: ['api.spec.js', 'app.spec.js'],
    fullyParallel: false,
    workers: 1,
    timeout: 30000,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    globalTeardown: './tests/teardown.js',
    use: {
        baseURL: 'http://127.0.0.1:3100',
        browserName: 'chromium',
        viewport: { width: 1440, height: 1000 },
        locale: 'es-AR',
        reducedMotion: 'reduce',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    webServer: {
        command: 'node scripts/test-server.js',
        url: 'http://127.0.0.1:3100/health',
        env: { PORT: '3100', DB_NAME: process.env.SPORTSWEAR_TEST_DB },
        reuseExistingServer: false,
        timeout: 30000
    }
});
