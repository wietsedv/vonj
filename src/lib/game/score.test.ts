/**
 * The 0-6 level score, against `docs/original-app/scoring.md`.
 */
import { categories } from '$lib/content';
import { gameRules, ruledSections } from '$lib/game/rules';
import { levelMistakes, levelScore, MAX_SCORE } from '$lib/game/score';
import type { Category, StoredItem } from '$lib/types';
import { describe, expect, it } from 'vitest';
import { item } from '../../tests/fixtures';

/** `attempts` items, each answered in the given number of attempts. */
const attempts = (...counts: number[]): StoredItem[] =>
	counts.map((count) =>
		item({
			responses: Array.from({ length: count }, (_, index) =>
				index === count - 1 ? ['aa'] : ['oo']
			)
		})
	);

describe('mistakes', () => {
	it('counts every attempt beyond the first', () => {
		expect(levelMistakes(attempts(1, 1, 1))).toBe(0);
		expect(levelMistakes(attempts(4))).toBe(3);
		expect(levelMistakes(attempts(1, 2, 3))).toBe(3);
	});

	it('does not credit an item that has not been answered at all', () => {
		expect(levelMistakes([item({ responses: [] })])).toBe(0);
	});
});

describe('the score', () => {
	it('gives a flawless level a 6', () => {
		expect(levelScore(attempts(1, 1, 1, 1, 1, 1, 1, 1, 1, 1), 3)).toBe(MAX_SCORE);
	});

	it('bottoms out at 0 once the tolerance is used up', () => {
		// Ten items at tolerance 3 allow thirty mistakes.
		const spent = Array.from({ length: 10 }, () => 4);
		expect(levelMistakes(attempts(...spent))).toBe(30);
		expect(levelScore(attempts(...spent), 3)).toBe(0);
	});

	it('never goes below 0, however bad it gets', () => {
		expect(levelScore(attempts(50), 3)).toBe(0);
	});

	it('scales linearly in between', () => {
		// Nine items at tolerance 2 allow eighteen mistakes; nine of them is half.
		const half = attempts(2, 2, 2, 2, 2, 2, 2, 2, 2);
		expect(levelMistakes(half)).toBe(9);
		expect(levelScore(half, 2)).toBe(3);
	});

	it('rounds to a whole number', () => {
		// One mistake over ten items at tolerance 3 costs 0.2 of a point.
		expect(levelScore(attempts(2, 1, 1, 1, 1, 1, 1, 1, 1, 1), 3)).toBe(6);
		// Five of them cost a full point.
		expect(levelScore(attempts(2, 2, 2, 2, 2, 1, 1, 1, 1, 1), 3)).toBe(5);
	});

	it('is stricter at a lower tolerance', () => {
		const played = attempts(2, 2, 2, 2, 2, 2, 2, 2, 2, 2);
		expect(levelScore(played, 2)).toBe(3);
		expect(levelScore(played, 3)).toBe(4);
	});
});

describe('the rules table', () => {
	// docs/original-app/scoring.md, "From mistakes to a score out of six".
	const TOLERANCES: [string, number][] = [
		['luisteren.verhaaltjes', 2],
		['lezen.verhaaltjes', 2],
		['luisteren.woorden', 3],
		['luisteren.woorden-tijdslimiet', 3],
		['lezen.zinnen', 3],
		['lezen.zinnen-tijdslimiet', 3],
		['schrijven.woorden', 3],
		['schrijven.woorden-tijdslimiet', 3],
		['spreken.korte-woorden', 3],
		['spreken.normale-woorden', 3],
		['spreken.lange-woorden', 3]
	];

	it.each(TOLERANCES)('tolerates %i mistakes per item in %s', (section, tolerance) => {
		const [category, id] = section.split('.');
		expect(gameRules(category as Category, id)?.tolerance).toBe(tolerance);
	});

	it('covers every section of the content set, and nothing that is not one', () => {
		const sections = categories.flatMap((category) =>
			category.sections.map((section) => `${category.id}.${section.id}`)
		);
		expect(ruledSections().sort()).toEqual(sections.sort());
	});
});
