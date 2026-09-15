/**
 * There is no backend: every page is prerendered at build time and the level
 * routes are reached by crawling the links on the category pages. Progress
 * lives in `localStorage`, so the prerendered markup is the same for everyone
 * and is filled in on mount.
 */
export const prerender = true;
