/**
 * The `<title>` of every page. The tab, the history entry and the first thing a
 * screen reader announces all come from here, so no route may leave it empty.
 *
 * The app's own name comes last, so the part that differs per page is the part
 * that survives a truncated tab.
 */

/** The app's name, as the original app and the global overview spell it. */
export const APP_NAME = 'Van Old noar Jong: Grunnegs';

/**
 * A page title: the given parts, most specific first, with the app's name
 * appended. `pageTitle('Level 2', 'Woorden', 'Luisteren')` becomes
 * "Level 2 - Woorden - Luisteren - Van Old noar Jong: Grunnegs".
 */
export function pageTitle(...parts: string[]): string {
	return [...parts, APP_NAME].join(' - ');
}
