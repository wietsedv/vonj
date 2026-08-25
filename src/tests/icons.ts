/**
 * Identifying which score icon is on screen.
 *
 * The four icons are inline SVG with no class or title to match on, so tests
 * fingerprint them by geometry: each icon is rendered once, and its path data
 * becomes the key it is recognised by afterwards. Nothing here hardcodes path
 * data, so redrawing an icon does not break these tests.
 */
import Play from '$lib/icons/play.svelte';
import StarFilled from '$lib/icons/star-filled.svelte';
import StarHalf from '$lib/icons/star-half.svelte';
import Star from '$lib/icons/star.svelte';
import { render } from 'vitest-browser-svelte';

export type IconName = 'play' | 'empty' | 'half' | 'full';

const signature = (svg: SVGElement): string =>
	[...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')).join('|');

const fingerprints = new Map<string, IconName>();

/**
 * Renders the four icons and records their fingerprints. Call from `beforeAll`
 * in any suite that asserts on stars.
 */
export async function learnIcons(): Promise<Map<string, IconName>> {
	if (fingerprints.size > 0) return fingerprints;

	const icons = [
		['play', Play],
		['empty', Star],
		['half', StarHalf],
		['full', StarFilled]
	] as const;

	for (const [name, Icon] of icons) {
		const { container, unmount } = await render(Icon);
		fingerprints.set(signature(container.querySelector('svg')!), name);
		unmount();
	}
	return fingerprints;
}

/**
 * What an element shows, as "full full half" or "play". Reads left to right,
 * so it can be compared against the table in `docs/original-app/scoring.md`.
 */
export function stars(root: Element): string {
	if (fingerprints.size === 0) throw new Error('Call learnIcons() in beforeAll first.');
	return [...root.querySelectorAll('svg')]
		.map((svg) => fingerprints.get(signature(svg)) ?? 'unrecognised')
		.join(' ');
}
