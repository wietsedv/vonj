/**
 * Schrijven > Woorden met tijdslimiet, in a browser: no free first letter, an
 * expiry that reveals and locks a letter without recording a response, the
 * submit button switching from "Versturen" to "Volgende" once the clock has
 * handed over the whole word, a correct answer stopping the clock, and no
 * interval leaking past the component's lifetime. See
 * `docs/original-app/games.md` and the file comment in
 * `SchrijvenWoordenTijdslimiet.svelte` for why an expiry here differs from
 * the untimed game's wrong-submit hints.
 *
 * The whole suite runs under `vi.useFakeTimers()`, installed before the
 * component ever mounts so the `Countdown` it creates is driven by the fake
 * clock from the start; `vi.waitFor` cannot be used to detect mounting under
 * fake timers (its own polling would need the very clock that is frozen), so
 * `open()` instead yields the microtask queue directly, which is unaffected
 * by faking `setInterval`/`Date.now`.
 */
import SchrijvenWoordenTijdslimiet from '$lib/components/games/SchrijvenWoordenTijdslimiet.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { storyWords, type WordInSentence } from '$lib/game/generate';
import { gameRules } from '$lib/game/rules';
import { writingItems } from '$lib/game/words';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('schrijven', 'woorden-tijdslimiet')[0];
const section: Section = getSection('schrijven', 'woorden-tijdslimiet')!;
const secondsPerStep = gameRules('schrijven', 'woorden-tijdslimiet')!.secondsPerStep!;

let story: Story;
let candidates: WordInSentence[];
/**
 * A word of at least three letters, so one expiry reveals a second letter
 * without completing the word by itself. Assigned in `beforeAll`, because a
 * `describe` body runs at collection time, before it.
 */
let entry: WordInSentence;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Renders the game and waits, via the microtask queue rather than a timer, for it to mount. */
async function open() {
	const rendered = render(SchrijvenWoordenTijdslimiet, {
		category: 'schrijven',
		section,
		level
	});
	const { container } = await rendered;
	for (let i = 0; i < 50 && container.querySelector('main')!.children.length === 0; i++) {
		await Promise.resolve();
	}
	return rendered;
}

const inputsOf = (container: HTMLElement) =>
	[...container.querySelectorAll('main input')] as HTMLInputElement[];

const typeInto = (input: HTMLInputElement, value: string) => {
	flushSync(() => {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const tap = (element: Element) => flushSync(() => (element as HTMLElement).click());

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

const stored = (i = 0): StoredItem => progress.level(level.id)!.items[i];

function seed(items: StoredItem[], score: number | null = null) {
	progress.save(level.id, { items: items.map((item) => ({ ...item, difficulty: 0 })), score });
}

const otherLetter = (letter: string) => (letter === 'a' ? 'b' : 'a');

/** Advances the fake clock and flushes the resulting Svelte state into the DOM. */
const advance = (ms: number) => flushSync(() => vi.advanceTimersByTime(ms));

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);

	const bySpelling = new Map<string, WordInSentence>();
	for (const entry of storyWords(story)) {
		if (entry.word.text.length < 3 || entry.word.text.length > 6) continue;
		if (!bySpelling.has(entry.word.text)) bySpelling.set(entry.word.text, entry);
	}
	candidates = [...bySpelling.values()];
	entry = candidates.find((candidate) => candidate.word.text.length >= 3)!;
});

beforeEach(() => {
	vi.useFakeTimers();
	progress.resetEverything();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('opening a level', () => {
	it('gives no letter for free', async () => {
		const entry = candidates[0];
		seed(writingItems([entry]));
		const { container } = await open();
		const boxes = inputsOf(container);

		expect(boxes.every((box) => !box.readOnly)).toBe(true);
		expect(boxes.every((box) => box.value === '')).toBe(true);
	});
});

describe('the clock', () => {
	it('reveals and locks the next letter on expiry, without recording a response', async () => {
		seed(writingItems([entry]));
		const { container } = await open();
		const target = stored().target;

		advance(secondsPerStep * 1000);

		const boxes = inputsOf(container);
		expect(boxes[0].readOnly).toBe(true);
		expect(boxes[0].value).toBe(target[0]);
		expect(stored().responses).toHaveLength(0);
	});

	it('does not hand out a hint on a wrong submit - only the clock does', async () => {
		seed(writingItems([entry]));
		const { container } = await open();
		const target = stored().target;
		const boxes = inputsOf(container);
		for (let i = 0; i < boxes.length; i++) typeInto(boxes[i], otherLetter(target[i]));
		tap(button(container, 'Versturen')!);

		expect(inputsOf(container).every((box) => !box.readOnly)).toBe(true);
		expect(text(container)).not.toContain('Dat klopt!');
		expect(text(container)).not.toContain('Jammer!');
	});

	it('replaces "Versturen" with "Volgende" once every letter has been given away', async () => {
		seed(writingItems([entry]));
		const { container } = await open();
		advance(secondsPerStep * 1000 * entry.word.text.length);

		expect(button(container, 'Versturen')).toBeUndefined();
		expect(button(container, 'Volgende')).toBeDefined();
		// Given away, not yet submitted: still on the boxes, not the feedback.
		expect(text(container)).not.toContain('Jammer!');
	});

	it('requires tapping "Volgende" before the feedback appears, then shows "Jammer!" with a single response', async () => {
		seed(writingItems([entry]));
		const { container } = await open();
		advance(secondsPerStep * 1000 * entry.word.text.length);
		tap(button(container, 'Volgende')!);

		expect(text(container)).toContain('Jammer!');
		expect(text(container)).toContain('Het juist geschreven woord is:');
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-primary'))).toBe(true);
		// No prior wrong submit in this run, so the completing tap is the only response.
		expect(stored().responses).toHaveLength(1);
	});

	it('stops immediately on a correct answer, before time runs out', async () => {
		seed(writingItems([entry]));
		const { container } = await open();
		const target = stored().target;
		const boxes = inputsOf(container);
		for (let i = 0; i < boxes.length; i++) typeInto(boxes[i], target[i]);
		tap(button(container, 'Versturen')!);

		expect(text(container)).toContain('Dat klopt!');
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-accent'))).toBe(true);

		// Nothing left ticking for this item.
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('tearing down', () => {
	it('leaves no interval running once the component is destroyed', async () => {
		const entry = candidates[0];
		seed(writingItems([entry]));
		const { unmount } = await open();
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
