/**
 * The game registry against the rules table.
 *
 * Every section that has rules is a playable section, so it needs a game. This
 * is the same shape of check `score.test.ts` runs on the rules table itself:
 * the content set decides which sections exist, and a new one cannot quietly
 * arrive without an implementation.
 */
import { games } from '$lib/components/games';
import { categories } from '$lib/content';
import { ruledSections } from '$lib/game/rules';
import { describe, expect, it } from 'vitest';

describe('the game registry', () => {
	it('has a game for every section that has rules', () => {
		expect(Object.keys(games).sort()).toEqual(ruledSections().sort());
	});

	it('has a game for every section of the content set', () => {
		const sections = categories.flatMap((category) =>
			category.sections.map((section) => `${category.id}.${section.id}`)
		);
		expect(Object.keys(games).sort()).toEqual(sections.sort());
	});
});
