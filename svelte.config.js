import adapter from '@sveltejs/adapter-static';

// GitHub Pages serves a project site from /<repo>, so the deploy workflow puts
// that prefix in BASE_PATH. It is "/" for a user site and empty locally, and
// SvelteKit wants neither a trailing slash nor a bare "/".
const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');

/**
 * The app has no backend, so every page is prerendered to a static file and
 * served as-is.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	kit: {
		adapter: adapter({
			// GitHub Pages serves 404.html for anything it cannot find, which lets
			// the app render its own error page instead of GitHub's.
			fallback: '404.html'
		}),
		paths: { base }
	}
};

export default config;
