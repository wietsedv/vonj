/**
 * The global overview, in a browser, against real stored progress.
 *
 * The layout calls `progress.load()` on mount; these tests render the page on
 * its own, so they load once and then drive the store through `save()` and
 * `resetEverything()`.
 */
import { categories, categoryLevels } from '$lib/content';
import { progress } from '$lib/progress.svelte';
import type { Category } from '$lib/types';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { level } from '../tests/fixtures';
import { learnIcons, stars } from '../tests/icons';

const page = async () => (await render((await import('./+page.svelte')).default)).container;

/** The card of one category, which is its link. */
const card = (container: HTMLElement, id: Category) =>
	container.querySelector<HTMLAnchorElement>(`a[href="/${id}"]`)!;

const scoreSlot = (element: Element) => element.querySelector('div.flex.justify-center')!;

/** Visible text with the template's line breaks collapsed, as a reader sees it. */
const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Finishes every level of a category with the given score. */
const finish = (id: Category, score: number | ((index: number) => number)) => {
	categoryLevels(id).forEach((entry, index) => {
		progress.save(entry.id, level(typeof score === 'number' ? score : score(index)));
	});
};

beforeAll(async () => {
	localStorage.clear();
	await learnIcons();
	progress.load();
});

beforeEach(() => progress.resetEverything());

describe('the four categories', () => {
	it('links to one page per category, in overview order', async () => {
		const container = await page();
		const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href]')];
		expect(links.map((link) => new URL(link.href).pathname)).toEqual(
			categories.map((category) => `/${category.id}`)
		);
	});

	it('names every category and draws its icon', async () => {
		const container = await page();
		for (const category of categories) {
			const link = card(container, category.id);
			expect(link.querySelector('h2')?.textContent).toBe(category.name);
			// The category icon, plus whatever the score slot is showing.
			expect(link.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
		}
	});
});

describe('with nothing played', () => {
	it('says none of the levels have been played', async () => {
		const container = await page();
		for (const category of categories) {
			expect(text(card(container, category.id))).toContain(
				`0 van de ${categoryLevels(category.id).length} levels gespeeld`
			);
		}
	});

	it('shows a play icon rather than stars', async () => {
		const container = await page();
		for (const category of categories) {
			expect(stars(scoreSlot(card(container, category.id)))).toBe('play');
		}
	});
});

describe('part way through a category', () => {
	it('counts the finished levels', async () => {
		progress.save('luisteren.verhaaltjes.bragel', level(6));
		progress.save('luisteren.verhaaltjes.kopstubber', level(3));
		const container = await page();
		expect(text(card(container, 'luisteren'))).toContain('2 van de 12 levels gespeeld');
	});

	it('does not count a level that was started but not finished', async () => {
		progress.save('luisteren.verhaaltjes.bragel', level(null));
		const container = await page();
		expect(text(card(container, 'luisteren'))).toContain('0 van de 12 levels gespeeld');
	});

	it('still shows a play icon, however good the finished levels were', async () => {
		for (const entry of categoryLevels('schrijven').slice(0, 7)) progress.save(entry.id, level(6));
		const container = await page();
		expect(text(card(container, 'schrijven'))).toContain('7 van de 8 levels gespeeld');
		expect(stars(scoreSlot(card(container, 'schrijven')))).toBe('play');
	});

	it('leaves the other categories alone', async () => {
		finish('schrijven', 6);
		const container = await page();
		expect(text(card(container, 'lezen'))).toContain('0 van de 12 levels gespeeld');
		expect(stars(scoreSlot(card(container, 'lezen')))).toBe('play');
	});
});

describe('with a category finished', () => {
	it('says so instead of counting', async () => {
		finish('schrijven', 6);
		const container = await page();
		const shownText = text(card(container, 'schrijven'));
		expect(shownText).toContain('Alle levels gespeeld!');
		expect(shownText).not.toMatch(/van de \d+ levels gespeeld/);
	});

	it('shows the average as stars', async () => {
		finish('schrijven', 6);
		const container = await page();
		expect(stars(scoreSlot(card(container, 'schrijven')))).toBe('full full full');
	});

	it('averages uneven level scores', async () => {
		// 6, 6, 6, 6, 6, 6, 2, 2 over eight levels is 5.0: full, full, half.
		finish('schrijven', (index) => (index < 6 ? 6 : 2));
		const container = await page();
		expect(stars(scoreSlot(card(container, 'schrijven')))).toBe('full full half');
	});

	it('shows an empty score for a category played badly', async () => {
		finish('schrijven', 0);
		const container = await page();
		const shownText = text(card(container, 'schrijven'));
		expect(shownText).toContain('Alle levels gespeeld!');
		expect(stars(scoreSlot(card(container, 'schrijven')))).toBe('empty empty empty');
	});
});

describe('after a reset', () => {
	it('goes back to counting from zero', async () => {
		finish('schrijven', 6);
		progress.resetCategory('schrijven');
		const container = await page();
		expect(text(card(container, 'schrijven'))).toContain('0 van de 8 levels gespeeld');
		expect(stars(scoreSlot(card(container, 'schrijven')))).toBe('play');
	});
});

describe('reaching the categories with a keyboard', () => {
	it('makes every card a real link, in reading order', async () => {
		const container = await page();
		const links = [...container.querySelectorAll('a[href]')];
		for (const link of links) {
			expect(link.tagName).toBe('A');
			// A real href, so it is focusable and follows on Enter without script.
			expect(link.getAttribute('href')).toMatch(/^\/[a-z]+$/);
			expect(link.hasAttribute('tabindex')).toBe(false);
		}
		expect(links).toHaveLength(categories.length);
	});

	it('focuses a card without a pointer', async () => {
		const container = await page();
		const first = card(container, 'luisteren');
		first.focus();
		expect(document.activeElement).toBe(first);
	});
});
