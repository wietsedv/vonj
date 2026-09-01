/**
 * The three-star score display, against the table in
 * `docs/original-app/scoring.md`.
 */
import Score from '$lib/components/Score.svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { learnIcons, stars } from '../../tests/icons';

beforeAll(learnIcons);

const shown = async (score: number | null | undefined) => {
	const { container } = await render(Score, { score });
	return { container, stars: stars(container) };
};

it('draws four icons that can be told apart', async () => {
	const fingerprints = await learnIcons();
	expect([...fingerprints.values()].sort()).toEqual(['empty', 'full', 'half', 'play']);
});

describe('a level score', () => {
	// docs/original-app/scoring.md, "From a score to stars".
	const TABLE: [number, string][] = [
		[0, 'empty empty empty'],
		[1, 'half empty empty'],
		[2, 'full empty empty'],
		[3, 'full half empty'],
		[4, 'full full empty'],
		[5, 'full full half'],
		[6, 'full full full']
	];

	it.each(TABLE)('shows %i as "%s"', async (score, expected) => {
		expect((await shown(score)).stars).toBe(expected);
	});

	it('always shows exactly three stars', async () => {
		for (const [score] of TABLE) {
			const { container } = await shown(score);
			expect(container.querySelectorAll('svg')).toHaveLength(3);
		}
	});
});

describe('a category average, which is not rounded first', () => {
	// Each star is worth two points, and lands on the nearest half.
	const TABLE: [number, string][] = [
		[0.4, 'empty empty empty'],
		[0.5, 'half empty empty'],
		[1.5, 'full empty empty'],
		[3.375, 'full half empty'],
		[4, 'full full empty'],
		[4.4, 'full full empty'],
		[4.5, 'full full half'],
		[5, 'full full half'],
		[5.5, 'full full full'],
		// Rounding the average to 6 first would be wrong, but so would reading
		// this as two and a half stars: 5.625 leaves 1.625 for the third star.
		[5.625, 'full full full']
	];

	it.each(TABLE)('shows %d as "%s"', async (score, expected) => {
		expect((await shown(score)).stars).toBe(expected);
	});
});

describe('when there is no score', () => {
	it('shows a play icon for a scope that is not finished', async () => {
		const { container, stars: shownStars } = await shown(null);
		expect(shownStars).toBe('play');
		expect(container.querySelectorAll('svg')).toHaveLength(1);
	});

	it('holds the space invisibly while progress is still unknown', async () => {
		const { container, stars: shownStars } = await shown(undefined);
		// Same icon, so the layout does not shift once localStorage has been read.
		expect(shownStars).toBe('play');
		expect(container.querySelector('.invisible')).not.toBeNull();
	});

	it('shows the play icon for real once progress is known', async () => {
		const { container } = await shown(null);
		expect(container.querySelector('.invisible')).toBeNull();
	});
});

describe('a score outside 0-6', () => {
	it('clamps a score above six', async () => {
		expect((await shown(7)).stars).toBe('full full full');
	});

	it('clamps a negative score', async () => {
		expect((await shown(-1)).stars).toBe('empty empty empty');
	});
});

// Three inline SVGs announce as nothing at all, so a level card would be read
// out as "Level 1" and no more. See TODO.md, "Accessibility".
describe('the text alternative', () => {
	it('names a whole number of stars', async () => {
		const { container } = await render(Score, { score: 4 });
		const row = container.firstElementChild!;
		expect(row.getAttribute('role')).toBe('img');
		expect(row.getAttribute('aria-label')).toBe('2 van de 3 sterren');
	});

	it('names a half star with a Dutch comma', async () => {
		const { container } = await render(Score, { score: 5 });
		expect(container.firstElementChild!.getAttribute('aria-label')).toBe('2,5 van de 3 sterren');
	});

	it('says a scope that is not finished has not been played', async () => {
		const { container } = await render(Score, { score: null });
		expect(container.firstElementChild!.getAttribute('aria-label')).toBe('Nog niet gespeeld');
	});

	it('claims nothing at all while progress is still unknown', async () => {
		const { container } = await render(Score, { score: undefined });
		const row = container.firstElementChild!;
		expect(row.getAttribute('aria-label')).toBeNull();
		expect(row.getAttribute('aria-hidden')).toBe('true');
	});
});

it('gives each half star its own clip, so several can share a page', async () => {
	const { container } = await render(Score, { score: 3 });
	const { container: second } = await render(Score, { score: 5 });
	const ids = [...container.querySelectorAll('clipPath'), ...second.querySelectorAll('clipPath')]
		.map((clip) => clip.id)
		.filter(Boolean);
	expect(ids).toHaveLength(2);
	expect(new Set(ids).size).toBe(2);
});
