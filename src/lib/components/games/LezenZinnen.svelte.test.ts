/**
 * Lezen > Zinnen end to end, in a browser: the "Resultaat" line, the head
 * start, a wrong submit's inline message and row markers, and the correct
 * feedback. See `docs/original-app/games.md`, "Lezen > Zinnen".
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`, as
 * `LezenVerhaaltjes.svelte.test.ts` does.
 */
import LezenZinnen from '$lib/components/games/LezenZinnen.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { freeHeadStart, rowIndex, sentenceItems, targetText } from '$lib/game/sentences';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('lezen', 'zinnen')[0];
const section: Section = getSection('lezen', 'zinnen')!;

let story: Story;
let index: Map<string, string>;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Renders the level and waits for the game to have loaded its story. */
async function open() {
	const { container } = await render(LezenZinnen, { category: 'lezen', section, level });
	await vi.waitFor(() =>
		expect(container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return container;
}

const rows = (container: HTMLElement) => [...container.querySelectorAll('main ul > li')];
const rowText = (row: Element) => text(row.querySelector('div.flex-1')!);
const isLocked = (row: Element) => row.querySelector('[aria-label="Sleephandvat"]') === null;

/** "correct", "up", "down" or "none", read off the marker icon's classes rather than its path data. */
function marker(row: Element): 'correct' | 'up' | 'down' | 'none' {
	const span = row.querySelector('div[aria-hidden="true"] > span');
	if (!span) return 'none';
	if (span.classList.contains('[&>svg]:fill-accent')) return 'correct';
	return span.classList.contains('rotate-180') ? 'down' : 'up';
}

/** The "Resultaat" card's line: the label "Resultaat" followed by the joined order. */
function resultLine(container: HTMLElement): string {
	const label = [...container.querySelectorAll('main p')].find((p) => text(p) === 'Resultaat');
	return text(label!.nextElementSibling as HTMLElement);
}

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

const click = (element: Element | undefined) => flushSync(() => (element as HTMLElement).click());

/** The stored item the game is playing right now. */
const stored = (position: number): StoredItem => progress.level(level.id)!.items[position];

/**
 * Seeds the level with `sentenceItems(story)`, overriding item 0's difficulty
 * and, optionally, its starting shuffle (the shuffled order `startingRows`
 * reads from `distractors[0]`).
 */
function seed(difficulty: number, distractors?: string[]): StoredItem[] {
	const items = sentenceItems(story);
	items[0] = {
		...items[0],
		difficulty,
		distractors: distractors ? [distractors] : items[0].distractors
	};
	progress.save(level.id, { items, score: null });
	return items;
}

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);
	index = rowIndex(story);
});

beforeEach(() => {
	progress.resetEverything();
});

describe('the "Resultaat" line', () => {
	it('joins the current order with bullet separators', async () => {
		const container = await open();
		const joined = rows(container).map(rowText).join(' • ');
		expect(resultLine(container)).toBe(joined);
	});

	it('updates when a row moves', async () => {
		const container = await open();
		const before = rows(container).map(rowText);

		const down = [...container.querySelectorAll('[aria-label="Naar beneden"]')].find(
			(candidate) => !(candidate as HTMLButtonElement).disabled
		);
		click(down);

		const after = rows(container).map(rowText);
		expect(after).not.toEqual(before);
		expect(resultLine(container)).toBe(after.join(' • '));
	});
});

it('shows the original instruction above the list, verbatim', async () => {
	const container = await open();
	expect(text(container)).toContain(
		'Gebruik de streepjes om de items naar de juiste volgorde te verslepen.'
	);
});

describe('the free head start', () => {
	it('gives two rows at difficulty -1', async () => {
		seed(-1);
		const container = await open();
		expect(rows(container).filter(isLocked)).toHaveLength(2);
	});

	it('gives one row at difficulty 0', async () => {
		seed(0);
		const container = await open();
		expect(rows(container).filter(isLocked)).toHaveLength(1);
	});

	it('gives no rows at difficulty 1', async () => {
		seed(1);
		const container = await open();
		expect(rows(container).filter(isLocked)).toHaveLength(0);
	});

	it('matches freeHeadStart() exactly', () => {
		expect(freeHeadStart(-1)).toBe(2);
		expect(freeHeadStart(0)).toBe(1);
		expect(freeHeadStart(1)).toBe(0);
	});
});

describe('a wrong submit', () => {
	/** Swaps the two rows right after the given head start, so the order is wrong regardless of the shuffle. */
	function wrongOrder(items: StoredItem[]): string[] {
		const target = items[0].target;
		const given = freeHeadStart(items[0].difficulty);
		const swapped = [...target];
		[swapped[given], swapped[given + 1]] = [swapped[given + 1], swapped[given]];
		return swapped;
	}

	it('shows the exact original message and marks every row', async () => {
		const alert = vi.spyOn(window, 'alert');
		const items = seed(0);
		seed(0, wrongOrder(items));

		const container = await open();
		click(button(container, 'Versturen'));

		expect(text(container)).toContain('Nog niet alle onderdelen staan op de juiste plaats');
		expect(stored(0).responses).toHaveLength(1);

		const markers = rows(container).map(marker);
		expect(markers).not.toContain('none');
		// The swap guarantees at least one row is out of place.
		expect(markers.some((value) => value === 'up' || value === 'down')).toBe(true);

		// The original showed this through a blocking `Dialogs.alert`; the web
		// version never calls `window.alert` (see docs/rewrite.md, "Alerts are
		// inline messages, not dialogs").
		expect(alert).not.toHaveBeenCalled();
	});

	it('clears the message and the markers once the pupil reorders', async () => {
		const items = seed(0);
		seed(0, wrongOrder(items));

		const container = await open();
		click(button(container, 'Versturen'));
		expect(text(container)).toContain('Nog niet alle onderdelen staan op de juiste plaats');

		const down = [...container.querySelectorAll('[aria-label="Naar beneden"]')].find(
			(candidate) => !(candidate as HTMLButtonElement).disabled
		);
		click(down);

		expect(text(container)).not.toContain('Nog niet alle onderdelen staan op de juiste plaats');
		expect(
			rows(container)
				.map(marker)
				.every((value) => value === 'none' || value === 'correct')
		).toBe(true);
	});
});

describe('a correct submit', () => {
	it('shows "Dat klopt!", "Het juiste verhaaltje was:" and the sentences in order', async () => {
		// A starting shuffle equal to the target order is already correct: no
		// reordering needed before pressing "Versturen".
		const target = sentenceItems(story)[0].target;
		const items = seed(0, [...target]);
		const container = await open();
		click(button(container, 'Versturen'));

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('Het juiste verhaaltje was:');
		for (const line of targetText(items[0], index)) {
			expect(text(container)).toContain(line);
		}
	});
});
