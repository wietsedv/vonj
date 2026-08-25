/**
 * The category overview, in a browser: the section list, the level cards, their
 * scores, and how the whole thing lays out on a small phone.
 */
import { categoryLevels, getCategory, sectionLevels } from '$lib/content';
import { progress } from '$lib/progress.svelte';
import type { Category } from '$lib/types';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { level } from '../tests/fixtures';
import { learnIcons, stars } from '../tests/icons';

const STORY_NAMES = ['bragel', 'kopstubber', 'scheuvels', 'zoepenbrij'];

const pages = {
	luisteren: () => import('./(categories)/luisteren/+page.svelte'),
	lezen: () => import('./(categories)/lezen/+page.svelte'),
	schrijven: () => import('./(categories)/schrijven/+page.svelte'),
	spreken: () => import('./(categories)/spreken/+page.svelte')
} satisfies Record<Category, () => Promise<unknown>>;

const open = async (id: Category) => (await render((await pages[id]()).default)).container;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();
const cards = (container: HTMLElement) => [...container.querySelectorAll('.grid > div')];
const scoreSlot = (element: Element) => element.querySelector('div.flex.justify-center')!;

const CATEGORIES: Category[] = ['luisteren', 'lezen', 'schrijven', 'spreken'];

beforeAll(async () => {
	localStorage.clear();
	await learnIcons();
	progress.load();
});

beforeEach(async () => {
	progress.resetEverything();
	await page.viewport(1280, 900);
});

describe.each(CATEGORIES)('the %s overview', (id) => {
	const content = getCategory(id)!;

	it('shows the category name and description', async () => {
		const container = await open(id);
		expect(container.querySelector('h1')?.textContent?.trim()).toBe(content.name);
		expect(text(container)).toContain(content.description);
	});

	it('shows every section with only the first line of its description', async () => {
		const shown = text(await open(id));
		for (const section of content.sections) {
			expect(shown).toContain(section.name);
			expect(shown).toContain(section.description[0]);
			for (const line of section.description.slice(1)) expect(shown).not.toContain(line);
		}
	});

	it('shows one card per level, labelled Level 1 to Level 4', async () => {
		const container = await open(id);
		expect(cards(container)).toHaveLength(categoryLevels(id).length);
		for (const section of content.sections) {
			const labels = sectionLevels(id, section.id).map((entry) => `Level ${entry.number}`);
			expect(labels).toEqual(['Level 1', 'Level 2', 'Level 3', 'Level 4']);
		}
		for (const card of cards(container)) {
			expect(text(card)).toMatch(/^Level [1-4]$/);
		}
	});

	it('never names the story behind a level', async () => {
		const shown = text(await open(id)).toLowerCase();
		for (const story of STORY_NAMES) expect(shown).not.toContain(story);
	});

	it('shows a play icon on every unplayed level', async () => {
		const container = await open(id);
		for (const card of cards(container)) expect(stars(scoreSlot(card))).toBe('play');
	});

	it('shows the score of a level that has been played', async () => {
		const levels = categoryLevels(id);
		progress.save(levels[0].id, level(6));
		progress.save(levels[1].id, level(3));

		const container = await open(id);
		const shown = cards(container);
		expect(stars(scoreSlot(shown[0]))).toBe('full full full');
		expect(stars(scoreSlot(shown[1]))).toBe('full half empty');
		expect(stars(scoreSlot(shown[2]))).toBe('play');
	});

	it('shows a play icon on a level that was started but not finished', async () => {
		const levels = categoryLevels(id);
		progress.save(levels[0].id, level(null));
		const container = await open(id);
		expect(stars(scoreSlot(cards(container)[0]))).toBe('play');
	});

	it('gives every element on the page a unique id', async () => {
		// The pages repeat the same icons dozens of times, so anything an icon
		// puts an id on has to be generated per instance.
		const container = await open(id);
		const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('on a 320px phone', () => {
	beforeEach(async () => {
		await page.viewport(320, 700);
	});

	it.each(CATEGORIES)('lays %s out without sideways scrolling', async (id) => {
		await open(id);
		const root = document.documentElement;
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
	});

	it.each(CATEGORIES)('keeps the level cards inside the viewport on %s', async (id) => {
		const container = await open(id);
		for (const card of cards(container)) {
			expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		}
	});

	it('puts the level cards in a grid of at least two columns', async () => {
		const container = await open('spreken');
		const grid = container.querySelector('.grid')!;
		const columns = getComputedStyle(grid).gridTemplateColumns.split(' ');
		expect(columns.length).toBeGreaterThanOrEqual(2);
	});

	it('is styled, so these measurements mean something', async () => {
		const container = await open('spreken');
		const header = container.querySelector('.bg-primary')!;
		// --color-primary from src/app.css.
		expect(getComputedStyle(header).backgroundColor).toBe('rgb(227, 20, 20)');
	});
});

describe('on a wide screen', () => {
	it('puts a whole section of four levels on one row', async () => {
		await page.viewport(1280, 900);
		const container = await open('spreken');
		const grid = container.querySelector('.grid')!;
		expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(4);
	});
});
