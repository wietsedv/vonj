import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, because the app has two kinds of thing to test.
 *
 * `client` runs in a real Chromium through Playwright, which is what the star
 * rendering, the layout at 320px and anything touching `localStorage` need.
 * `server` runs in node and covers the content set, the storage wrapper, the
 * progress model and the server-rendered markup.
 *
 * Both extend `vite.config.ts`, so tests see the same Tailwind and SvelteKit
 * pipeline as the app.
 */
export default defineConfig({
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					include: ['src/**/*.svelte.test.ts'],
					setupFiles: ['./vitest-setup-client.ts'],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						instances: [{ browser: 'chromium' }]
					}
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts']
				}
			}
		]
	}
});
