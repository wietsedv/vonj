/**
 * The server-rendered markup.
 *
 * localStorage does not exist here, so the point of these tests is what the
 * markup must *not* claim: no scores, no "x van de y levels gespeeld". The
 * browser fills that in after mount, and it must not have to correct anything.
 *
 * Every screen below the language picker is rendered once per language, with
 * that language's copy.
 */
import { categories, categoryLevels, getCategory, sectionLevels, storyKeys } from '$lib/content';
import { getLanguage, languages } from '$lib/languages';
import type { Category, Language } from '$lib/types';
import type { Component } from 'svelte';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

const PROGRESS_COPY = /van de \d+ levels gespeeld|Alle levels gespeeld/;

// The route components take `data` from their load functions; here it is
// handed in directly, so their prop types are loosened to match.
type Page = Component<{ data: { language: Language } }>;

const pages: Record<Category | 'home', () => Promise<Page>> = {
	home: async () => (await import('./[language=language]/+page.svelte')).default as Page,
	luisteren: async () =>
		(await import('./[language=language]/(categories)/luisteren/+page.svelte')).default as Page,
	lezen: async () =>
		(await import('./[language=language]/(categories)/lezen/+page.svelte')).default as Page,
	schrijven: async () =>
		(await import('./[language=language]/(categories)/schrijven/+page.svelte')).default as Page,
	spreken: async () =>
		(await import('./[language=language]/(categories)/spreken/+page.svelte')).default as Page
};

const rendered = async (page: Category | 'home', language: Language) =>
	render(await pages[page](), { props: { data: { language } } });

describe('the language picker', () => {
	const picker = async () => render((await import('./+page.svelte')).default);

	it('offers every language, by the name of its own app', async () => {
		const { body } = await picker();
		for (const language of languages) {
			const [start, end] = language.appName.split(': ');
			expect(body).toContain(`${start}:<br/>${end}`);
			expect(body).toContain(`href="/${language.id}"`);
		}
	});

	it('shows each language in its own palette, with its own icon', async () => {
		const { body } = await picker();
		for (const language of languages) {
			expect(body).toContain(`data-palette="${language.id}"`);
			expect(body).toContain(`src="${language.icon}"`);
		}
	});

	it('does not take on the palette of either language for the page itself', async () => {
		expect((await picker()).body).not.toContain('data-page');
	});

	it('titles the tab with both apps', async () => {
		expect((await picker()).head).toContain(
			'<title>Van Old noar Jong: Grunnegs / Van Old naor Jong: Achterhooks</title>'
		);
	});

	it('puts its content in a landmark the skip link can reach', async () => {
		expect((await picker()).body).toContain('<main id="inhoud"');
	});
});

describe.each(languages.map(({ id }) => id))('in %s', (language) => {
	const info = getLanguage(language);

	describe('the language layout', () => {
		const layout = async () =>
			render((await import('./[language=language]/+layout.svelte')).default, {
				props: {
					data: { language },
					children: createRawSnippet(() => ({ render: () => '<p>inhoud</p>' }))
				}
			});

		it('wraps the page in the palette of the language', async () => {
			const { body } = await layout();
			expect(body).toContain(`data-palette="${language}"`);
			expect(body).toContain('data-page');
			expect(body).toContain('<p>inhoud</p>');
		});

		it('uses the icon of the language as the favicon', async () => {
			expect((await layout()).head).toContain(`<link rel="icon" href="${info.icon}"`);
		});
	});

	describe('the global overview', () => {
		const home = async () => (await rendered('home', language)).body;

		it('renders its title and both taglines', async () => {
			const body = await home();
			const [start, end] = info.appName.split(': ');
			expect(body).toContain(`${start}:<br/>${end}`);
			expect(body).toContain(info.question);
			expect(body).toContain('Speel alle levels om erachter te komen!');
		});

		it('asks in the words of the original app', async () => {
			expect(await home()).toContain(
				language === 'gronings' ? 'Hoe goed is jouw Gronings?' : 'Hoe goed is jouw Achterhooks?'
			);
		});

		it('renders every category with a link to its page', async () => {
			const body = await home();
			for (const category of categories(language)) {
				expect(body).toContain(category.name);
				expect(body).toContain(`href="/${language}/${category.id}"`);
			}
		});

		it('offers a way back to the language picker', async () => {
			const body = await home();
			expect(body).toContain('aria-label="Terug naar het overzicht"');
			expect(body).toContain('href="/"');
		});

		it('claims no progress', async () => {
			expect(await home()).not.toMatch(PROGRESS_COPY);
		});

		it('titles the tab with the app, rather than leaving it empty', async () => {
			expect((await rendered('home', language)).head).toContain(`<title>${info.appName}</title>`);
		});

		it('puts its content in a landmark the skip link can reach', async () => {
			expect(await home()).toContain('<main id="inhoud"');
		});

		it('holds the space a score will take without showing one', async () => {
			// Score renders an invisible play icon while progress is still unknown.
			const body = await home();
			expect((body.match(/class="invisible"/g) ?? []).length).toBe(categories(language).length);
		});
	});

	describe.each(categories(language).map((category) => category.id))('the %s overview', (id) => {
		const content = getCategory(language, id)!;
		const page = async () => (await rendered(id, language)).body;

		it('renders the category name and description', async () => {
			const body = await page();
			expect(body).toContain(content.name);
			expect(body).toContain(content.description);
		});

		it('renders every section with only the first line of its description', async () => {
			const body = await page();
			for (const section of content.sections) {
				expect(body).toContain(section.name);
				expect(body).toContain(section.description[0]);
				// The second line belongs to the level itself, not the overview.
				for (const line of section.description.slice(1)) expect(body).not.toContain(line);
			}
		});

		it('renders one numbered card per level', async () => {
			const body = await page();
			const cards = body.match(/Level [1-9]/g) ?? [];
			expect(cards).toHaveLength(categoryLevels(language, id).length);
			expect(new Set(cards)).toEqual(new Set(['Level 1', 'Level 2', 'Level 3', 'Level 4']));
		});

		it('never names the story behind a level', async () => {
			const body = (await page()).toLowerCase();
			for (const story of storyKeys(language)) expect(body).not.toContain(story);
		});

		it('offers a way back up to the global overview of the language', async () => {
			const body = await page();
			expect(body).toContain('aria-label="Terug naar het overzicht"');
			expect(body).toContain(`href="/${language}"`);
		});

		it('links every level card to its level, by number', async () => {
			const body = await page();
			for (const section of content.sections) {
				for (const level of sectionLevels(language, id, section.id)) {
					expect(body).toContain(`href="/${language}/${id}/${section.id}/${level.number}"`);
				}
			}
		});

		it('claims no progress', async () => {
			expect(await page()).not.toMatch(PROGRESS_COPY);
		});

		it('titles the tab with the category and then the app', async () => {
			expect((await rendered(id, language)).head).toContain(
				`<title>${content.name} - ${info.appName}</title>`
			);
		});

		it('puts its content in a landmark the skip link can reach', async () => {
			expect(await page()).toContain('<main id="inhoud"');
		});

		it('holds the space every score will take without showing one', async () => {
			const body = await page();
			expect((body.match(/class="invisible"/g) ?? []).length).toBe(
				categoryLevels(language, id).length
			);
		});
	});
});
