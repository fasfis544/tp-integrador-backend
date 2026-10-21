import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';

export default defineConfig({
    ...config,
    testMatch: 'capturas.spec.js',
    reporter: [['list']],
    outputDir: 'test-results/screenshots'
});
