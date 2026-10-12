/**
 * The level route: what a URL resolves to, and what the server renders for it.
 *
 * localStorage does not exist here, so the point is that the chrome around the
 * game is complete and claims nothing about progress. The items, the dots and
 * the result all arrive in the browser.
 */
import { getSection, sectionLevels, storyKeys } from '$lib/content';
import { ruledSections } from '$lib/game/rules';
import { getLanguage, languages } from '$lib/languages';
import type { Language } from '$lib/types';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { load } from './[language=language]/[category=category]/[section]/[level]/+page';
import { match } from '../params/category';
import { match as matchLanguage } from '../params/language';

// The load function only reads `params` and the language from the layout above
// it; nothing else of the event is touched.
const open = (language: Language, category: string, section: string, level: string) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(load as any)({
		params: { language, category, section, level },
		parent: async () => ({ language })
	});

/** The status a URL is refused with, or 0 when it is not refused at all. */
async function refused(
	language: Language,
	category: string,
	section: string,
	level: string
): Promise<number> {
	try {
		await open(language, category, section, level);
		return 0;
	} catch (thrown) {
		return (thrown as { status?: number }).status ?? 0;
	}
}

const rendered = async (language: Language, category: string, section: string, level: string) => {
	const data = { language, ...(await open(language, category, section, level)) };
	const props = { data, params: { language, category, section, level } };
	const { default: Page } =
		await import('./[language=language]/[category=category]/[section]/[level]/+page.svelte');
	return render(Page, { props });
};

describe('the language segment', () => {
	it('matches the two languages', () => {
		expect(matchLanguage('gronings')).toBe(true);
		expect(matchLanguage('achterhoeks')).toBe(true);
	});

	it('matches nothing else', () => {
		for (const other of ['Gronings', 'achterhooks', 'luisteren', 'favicon.svg', '']) {
			expect(matchLanguage(other)).toBe(false);
		}
	});
});

describe('the category segment', () => {
	it('matches the four categories', () => {
		for (const category of ['luisteren', 'lezen', 'schrijven', 'spreken']) {
			expect(match(category)).toBe(true);
		}
	});

	it('matches nothing else, so the level route cannot swallow a URL', () => {
		for (const other of ['listen', 'onbekend', 'favicon.svg', '']) {
			expect(match(other)).toBe(false);
		}
	});
});

describe.each(languages.map(({ id }) => id))('in %s', (language) => {
	const stories = storyKeys(language);
	const page = async (category: string, section: string, level: string) =>
		(await rendered(language, category, section, level)).body;
	/** The `<head>` the same route renders, for the `<title>` it must carry. */
	const pageHead = async (category: string, section: string, level: string) =>
		(await rendered(language, category, section, level)).head;

	describe('resolving a URL to a level', () => {
		it('names the storage key of the level the URL points at', async () => {
			// docs/rewrite.md: the URL segments are the level key, minus the story.
			const { level } = await open(language, 'luisteren', 'woorden', '1');
			expect(level.id).toBe(`${language}.luisteren.woorden.${stories[0]}`);
			expect(level.language).toBe(language);
			expect(level.number).toBe(1);
		});

		it('counts levels from one, in the order the content lists the stories', async () => {
			for (const [index, story] of stories.entries()) {
				const { level } = await open(language, 'luisteren', 'woorden', String(index + 1));
				expect(level.story).toBe(story);
			}
		});

		it('resolves every level of every section', async () => {
			for (const key of ruledSections()) {
				const [category, section] = key.split('.');
				for (const level of sectionLevels(language, category as never, section)) {
					const resolved = await open(language, category, section, String(level.number));
					expect(resolved.level.id).toBe(level.id);
					expect(resolved.section.id).toBe(section);
				}
			}
		});

		it('refuses a section that does not exist in the category', async () => {
			// "zinnen" is a Lezen section, so it is not a Luisteren level.
			expect(await refused(language, 'luisteren', 'zinnen', '1')).toBe(404);
			expect(await refused(language, 'luisteren', 'onbekend', '1')).toBe(404);
		});

		it('refuses a level number the section does not have', async () => {
			for (const number of ['0', '5', '01', 'een', '']) {
				expect(await refused(language, 'luisteren', 'woorden', number)).toBe(404);
			}
		});
	});

	describe('the server-rendered level', () => {
		it('shows the section name and both lines of its description', async () => {
			const body = await page('luisteren', 'woorden', '1');
			const section = getSection(language, 'luisteren', 'woorden')!;

			expect(section.description).toHaveLength(2);
			expect(body).toContain(section.name);
			for (const line of section.description) expect(body).toContain(line);
		});

		it('offers a way back to the category overview', async () => {
			const body = await page('lezen', 'zinnen', '2');
			expect(body).toContain('Terug naar het overzicht');
		});

		it('never names the story the level is played on', async () => {
			for (const key of ruledSections()) {
				const [category, section] = key.split('.');
				const body = (await page(category, section, '3')).toLowerCase();
				for (const story of stories) expect(body).not.toContain(story);
			}
		});

		it('claims no progress and shows no score', async () => {
			const body = await page('spreken', 'korte-woorden', '4');
			expect(body).not.toMatch(/Goed gedaan|Dat klopt|Doorgaan/);
		});

		it('titles the tab with the level, the section, the category and the app', async () => {
			expect(await pageHead('luisteren', 'woorden', '1')).toContain(
				`<title>Level 1 - Woorden - Luisteren - ${getLanguage(language).appName}</title>`
			);
		});

		it('goes back to the category overview of the same language', async () => {
			expect(await page('lezen', 'zinnen', '2')).toContain(`href="/${language}/lezen"`);
		});

		it('never names the story in the title either', async () => {
			for (const key of ruledSections()) {
				const [category, section] = key.split('.');
				const head = (await pageHead(category, section, '3')).toLowerCase();
				expect(head).toContain('<title>level 3 - ');
				for (const story of stories) expect(head).not.toContain(story);
			}
		});

		it('renders the shell of every section, and none of its items', async () => {
			// Every section has a game now, and a game only appears in the browser: its
			// items live in localStorage and its media comes from a story chunk. So the
			// server renders the shell and nothing of the interaction. See
			// docs/rewrite.md.
			for (const key of ruledSections()) {
				const [category, section] = key.split('.');
				const body = await page(category, section, '1');
				expect(body).not.toMatch(/Helaas|Versturen|<img/);
				expect(body).toContain('Terug naar het overzicht');
			}
		});
	});
});
