/**
 * The server-rendered markup.
 *
 * localStorage does not exist here, so the point of these tests is what the
 * markup must *not* claim: no scores, no "x van de y levels gespeeld". The
 * browser fills that in after mount, and it must not have to correct anything.
 */
import { categories, categoryLevels, getCategory, sectionLevels } from '$lib/content';
import type { Category } from '$lib/types';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

const PROGRESS_COPY = /van de \d+ levels gespeeld|Alle levels gespeeld/;
const STORY_NAMES = ['bragel', 'kopstubber', 'scheuvels', 'zoepenbrij'];

const home = async () => render((await import('./+page.svelte')).default).body;

const categoryPages: Record<Category, () => Promise<string>> = {
	luisteren: async () =>
		render((await import('./(categories)/luisteren/+page.svelte')).default).body,
	lezen: async () => render((await import('./(categories)/lezen/+page.svelte')).default).body,
	schrijven: async () =>
		render((await import('./(categories)/schrijven/+page.svelte')).default).body,
	spreken: async () => render((await import('./(categories)/spreken/+page.svelte')).default).body
};

describe('the global overview', () => {
	it('renders its title and both taglines', async () => {
		const body = await home();
		expect(body).toContain('Van Old noar Jong:');
		expect(body).toContain('Grunnegs');
		expect(body).toContain('Hoe goed is jouw Gronings?');
		expect(body).toContain('Speel alle levels om erachter te komen!');
	});

	it('renders every category with a link to its page', async () => {
		const body = await home();
		for (const category of categories) {
			expect(body).toContain(category.name);
			expect(body).toContain(`href="/${category.id}"`);
		}
	});

	it('has no back button, being the top of the stack', async () => {
		expect(await home()).not.toContain('aria-label="Terug naar het overzicht"');
	});

	it('claims no progress', async () => {
		expect(await home()).not.toMatch(PROGRESS_COPY);
	});

	it('holds the space a score will take without showing one', async () => {
		// Score renders an invisible play icon while progress is still unknown.
		const body = await home();
		expect((body.match(/class="invisible"/g) ?? []).length).toBe(categories.length);
	});
});

describe.each(categories.map((category) => category.id))('the %s overview', (id) => {
	const content = getCategory(id)!;

	it('renders the category name and description', async () => {
		const body = await categoryPages[id]();
		expect(body).toContain(content.name);
		expect(body).toContain(content.description);
	});

	it('renders every section with only the first line of its description', async () => {
		const body = await categoryPages[id]();
		for (const section of content.sections) {
			expect(body).toContain(section.name);
			expect(body).toContain(section.description[0]);
			// The second line belongs to the level itself, not the overview.
			for (const line of section.description.slice(1)) expect(body).not.toContain(line);
		}
	});

	it('renders one numbered card per level', async () => {
		const body = await categoryPages[id]();
		const cards = body.match(/Level [1-9]/g) ?? [];
		expect(cards).toHaveLength(categoryLevels(id).length);
		expect(new Set(cards)).toEqual(new Set(['Level 1', 'Level 2', 'Level 3', 'Level 4']));
	});

	it('never names the story behind a level', async () => {
		const body = (await categoryPages[id]()).toLowerCase();
		for (const story of STORY_NAMES) expect(body).not.toContain(story);
	});

	it('offers a way back up to the global overview', async () => {
		const body = await categoryPages[id]();
		expect(body).toContain('aria-label="Terug naar het overzicht"');
		expect(body).toContain('href="/"');
	});

	it('links every level card to its level, by number', async () => {
		const body = await categoryPages[id]();
		for (const section of content.sections) {
			for (const level of sectionLevels(id, section.id)) {
				expect(body).toContain(`href="/${id}/${section.id}/${level.number}"`);
			}
		}
	});

	it('claims no progress', async () => {
		expect(await categoryPages[id]()).not.toMatch(PROGRESS_COPY);
	});

	it('holds the space every score will take without showing one', async () => {
		const body = await categoryPages[id]();
		expect((body.match(/class="invisible"/g) ?? []).length).toBe(categoryLevels(id).length);
	});
});
