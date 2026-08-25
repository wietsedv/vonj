/**
 * The real stylesheet, so tests that assert on layout measure what the app
 * actually renders rather than unstyled markup.
 */
import './src/app.css';

// Registers `render` on the browser `page` and cleans up after every test.
import 'vitest-browser-svelte';
