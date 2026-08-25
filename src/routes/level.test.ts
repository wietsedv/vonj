/**
 * The level route: what a URL resolves to, and what the server renders for it.
 *
 * localStorage does not exist here, so the point is that the chrome around the
 * game is complete and claims nothing about progress. The items, the dots and
 * the result all arrive in the browser.
 */
import { getSection, sectionLevels } from '$lib/content';
import { ruledSections } from '$lib/game/rules';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { load } from './[category=category]/[section]/[level]/+page';
import { match } from '../params/category';

const STORY_NAMES = ['bragel', 'kopstubber', 'scheuvels', 'zoepenbrij'];

// The load function only reads `params`; nothing else of the event is touched.
const open = (category: string, section: string, level: string) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(load as any)({ params: { category, section, level } });

/** The status a URL is refused with, or 0 when it is not refused at all. */
function refused(category: string, section: string, level: string): number {
	try {
		open(category, section, level);
		return 0;
	} catch (thrown) {
		return (thrown as { status?: number }).status ?? 0;
	}
}

const page = async (category: string, section: string, level: string) => {
	const props = { data: open(category, section, level), params: { category, section, level } };
	const { default: Page } = await import('./[category=category]/[section]/[level]/+page.svelte');
	return render(Page, { props }).body;
};

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

describe('resolving a URL to a level', () => {
	it('names the storage key of the level the URL points at', () => {
		// docs/rewrite.md: the URL segments are the level key, minus the story.
		const { level } = open('luisteren', 'woorden', '1');
		expect(level.id).toBe('luisteren.woorden.bragel');
		expect(level.number).toBe(1);
	});

	it('counts levels from one, in the order the content lists the stories', () => {
		for (const [index, story] of STORY_NAMES.entries()) {
			const { level } = open('luisteren', 'woorden', String(index + 1));
			expect(level.story).toBe(story);
		}
	});

	it('resolves every level of every section', () => {
		for (const key of ruledSections()) {
			const [category, section] = key.split('.');
			for (const level of sectionLevels(category as never, section)) {
				const resolved = open(category, section, String(level.number));
				expect(resolved.level.id).toBe(level.id);
				expect(resolved.section.id).toBe(section);
			}
		}
	});

	it('refuses a section that does not exist in the category', () => {
		// "zinnen" is a Lezen section, so it is not a Luisteren level.
		expect(refused('luisteren', 'zinnen', '1')).toBe(404);
		expect(refused('luisteren', 'onbekend', '1')).toBe(404);
	});

	it('refuses a level number the section does not have', () => {
		for (const number of ['0', '5', '01', 'een', '']) {
			expect(refused('luisteren', 'woorden', number)).toBe(404);
		}
	});
});

describe('the server-rendered level', () => {
	it('shows the section name and both lines of its description', async () => {
		const body = await page('luisteren', 'woorden', '1');
		const section = getSection('luisteren', 'woorden')!;

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
			for (const story of STORY_NAMES) expect(body).not.toContain(story);
		}
	});

	it('claims no progress and shows no score', async () => {
		const body = await page('spreken', 'korte-woorden', '4');
		expect(body).not.toMatch(/Goed gedaan|Dat klopt|Doorgaan/);
	});

	it('says so for a section whose game does not exist yet', async () => {
		const body = await page('schrijven', 'woorden', '1');
		expect(body).toContain("Onderdeel 'Woorden' is nog niet geïmplementeerd");
	});
});
