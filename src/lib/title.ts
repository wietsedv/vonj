/**
 * The `<title>` of every page. The tab, the history entry and the first thing a
 * screen reader announces all come from here, so no route may leave it empty.
 *
 * The app's own name comes last, so the part that differs per page is the part
 * that survives a truncated tab.
 */

import { getLanguage } from '$lib/languages';
import type { Language } from '$lib/types';

/**
 * A page title: the given parts, most specific first, with the name of the app
 * in that language appended. `pageTitle('gronings', 'Level 2', 'Woorden',
 * 'Luisteren')` becomes "Level 2 - Woorden - Luisteren - Van Old noar Jong:
 * Grunnegs".
 */
export function pageTitle(language: Language, ...parts: string[]): string {
	return [...parts, getLanguage(language).appName].join(' - ');
}
