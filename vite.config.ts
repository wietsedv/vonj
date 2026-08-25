import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		// Content media must stay separate files: the short sound and word
		// recordings are under Vite's inline threshold, and base64-ing them into
		// the module that holds every asset URL would ship them on first load and
		// make them uncacheable.
		assetsInlineLimit: (path) => (path.includes('/lib/content/assets/') ? false : undefined)
	}
});
