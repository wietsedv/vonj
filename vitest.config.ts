import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, because the app has two kinds of thing to test.
 *
 * `client` runs in real browsers through Playwright, which is what the star
 * rendering, the layout at 320px and anything touching `localStorage` need. The
 * whole suite runs three times over, once per engine: Chromium, Firefox and
 * WebKit, the last standing in for Safari, which is what an iPad in a classroom
 * runs. The engines disagree often enough to be worth it - where focus goes when
 * a button is disabled, what `beforeinput` carries, how quickly a seeked
 * recording starts - so a test may not assume any one of them.
 *
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
						instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }]
					}
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts'],
					/*
					 * The progress store is a module singleton with a one-shot
					 * `load()`, so the tests around it take a fresh copy per test with
					 * `vi.resetModules()` and a dynamic import. That re-instantiates the
					 * module graph inside the test body, which is far slower than the
					 * assertions themselves, and `npm test` runs this project alongside
					 * three browsers compiling their own suite. The default 5 s is
					 * enough for either alone and not for both at once, so it is raised
					 * here rather than left to trip whenever the machine is busy.
					 */
					testTimeout: 20_000
				}
			}
		]
	}
});
