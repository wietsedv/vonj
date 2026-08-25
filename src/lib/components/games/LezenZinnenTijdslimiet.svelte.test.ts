/**
 * Lezen > Zinnen met tijdslimiet: the clock variant of the reordering game.
 * See `docs/original-app/games.md`, "Lezen > Zinnen", its "Timed variant"
 * paragraph, and "The three timed sections do not agree on what an expiry
 * costs" - here an expiry hands a row over for free and records no response.
 *
 * Fake timers work in this browser project with `{ shouldAdvanceTime: true }`:
 * that keeps `vi.waitFor`'s own polling alive (it depends on real time
 * passing) while still letting the test jump the clock forward with
 * `vi.advanceTimersByTime`.
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`, as
 * `LezenVerhaaltjes.svelte.test.ts` does.
 */
import LezenZinnenTijdslimiet from '$lib/components/games/LezenZinnenTijdslimiet.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { gameRules } from '$lib/game/rules';
import { sentenceItems } from '$lib/game/sentences';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('lezen', 'zinnen-tijdslimiet')[0];
const section: Section = getSection('lezen', 'zinnen-tijdslimiet')!;
const secondsPerStep = gameRules('lezen', 'zinnen-tijdslimiet')!.secondsPerStep!;

let story: Story;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Renders the level and waits for the game to have loaded its story. */
async function open() {
	const rendered = await render(LezenZinnenTijdslimiet, { category: 'lezen', section, level });
	await vi.waitFor(() =>
		expect(rendered.container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return rendered;
}

const rows = (container: HTMLElement) => [...container.querySelectorAll('main ul > li')];
const isLocked = (row: Element) => row.querySelector('[aria-label="Sleephandvat"]') === null;

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

const click = (element: Element | undefined) => flushSync(() => (element as HTMLElement).click());

/** The stored item the game is playing right now. */
const stored = (position: number): StoredItem => progress.level(level.id)!.items[position];

/** Seeds the level with `sentenceItems(story)`, optionally overriding item 0's starting shuffle. */
function seed(distractors?: string[]): StoredItem[] {
	const items = sentenceItems(story);
	if (distractors) items[0] = { ...items[0], distractors: [distractors] };
	progress.save(level.id, { items, score: null });
	return items;
}

/** Advances the fake clock by whole steps of the timer, flushing Svelte's reactivity after each. */
function advanceSteps(steps: number) {
	for (let i = 0; i < steps; i++) {
		vi.advanceTimersByTime(secondsPerStep * 1000);
		flushSync();
	}
}

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);
});

beforeEach(() => {
	progress.resetEverything();
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

it('gives no free head start, regardless of difficulty', async () => {
	const items = sentenceItems(story);
	items[0] = { ...items[0], difficulty: -1 };
	progress.save(level.id, { items, score: null });

	const { container } = await open();
	expect(rows(container).filter(isLocked)).toHaveLength(0);
});

describe('an expiry', () => {
	it('locks the next correct row in place and records no response', async () => {
		seed();
		const { container } = await open();

		expect(stored(0).responses).toHaveLength(0);
		advanceSteps(1);

		expect(rows(container).filter(isLocked)).toHaveLength(1);
		// Handed over for free: still no response, so it never costs score.
		expect(stored(0).responses).toHaveLength(0);
	});

	it('locks one more row per expiry, and the clock stops once every row is given', async () => {
		const items = seed();
		const rowCount = items[0].target.length;
		const before = vi.getTimerCount();

		const { container } = await open();
		expect(vi.getTimerCount()).toBe(before + 1);

		advanceSteps(rowCount);

		expect(rows(container).filter(isLocked)).toHaveLength(rowCount);
		expect(text(container)).toContain('Tijd is om!');
		// The countdown clears its own interval once it has nothing left to give.
		expect(vi.getTimerCount()).toBe(before);
	});
});

it('keeps the "Versturen" label throughout, before and after an expiry', async () => {
	seed();
	const { container } = await open();
	expect(button(container, 'Versturen')).toBeDefined();

	advanceSteps(1);
	expect(button(container, 'Versturen')).toBeDefined();
	expect(button(container, 'Volgende')).toBeUndefined();
});

describe('a correct answer', () => {
	it('stops the clock immediately, before any row has timed out', async () => {
		const items = seed();
		seed([...items[0].target]);
		const before = vi.getTimerCount();

		const { container } = await open();
		expect(vi.getTimerCount()).toBe(before + 1);

		click(button(container, 'Versturen'));

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).not.toContain('Jammer!');
		expect(vi.getTimerCount()).toBe(before);
	});
});

describe('tearing down', () => {
	it('leaves no interval running once the component is destroyed', async () => {
		seed();
		const before = vi.getTimerCount();
		const { unmount } = await open();
		expect(vi.getTimerCount()).toBe(before + 1);

		unmount();
		expect(vi.getTimerCount()).toBe(before);
	});
});
