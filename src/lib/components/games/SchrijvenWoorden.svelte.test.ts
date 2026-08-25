/**
 * Schrijven > Woorden end to end, in a browser: the "Grunnegs"/"Nederlands"
 * prompt, the letter boxes, the free first letter, wrong submits handing out
 * hints, a hint completing the word, and resuming a half-answered item. See
 * `docs/original-app/games.md`, "Schrijven > Woorden".
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`, as
 * `LezenVerhaaltjes.svelte.test.ts` does.
 *
 * Most tests seed a single, hand-picked word instead of letting the game draw
 * its own random ten, so the exact target spelling - and therefore what a
 * "wrong" attempt looks like - is known up front.
 */
import SchrijvenWoorden from '$lib/components/games/SchrijvenWoorden.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { storyWords, type WordInSentence } from '$lib/game/generate';
import { maskedPrompt, wordIndex, writingItems } from '$lib/game/words';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('schrijven', 'woorden')[0];
const section: Section = getSection('schrijven', 'woorden')!;

let story: Story;
let index: Map<string, WordInSentence>;
/** Every word of the story that qualifies, deduplicated by spelling - the same filter `selectWords()` applies, without its random pick. */
let candidates: WordInSentence[];
/**
 * A word of at least three letters, so that one wrong submit reveals a second
 * letter without immediately completing the word by itself. Assigned in
 * `beforeAll`, because a `describe` body runs at collection time, before it.
 */
let entry: WordInSentence;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

async function open() {
	const { container } = await render(SchrijvenWoorden, { category: 'schrijven', section, level });
	await vi.waitFor(() =>
		expect(container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return container;
}

const inputsOf = (container: HTMLElement) =>
	[...container.querySelectorAll('main input')] as HTMLInputElement[];

/** Sets a box's value as typing would, and fires the input event. */
const typeInto = (input: HTMLInputElement, value: string) => {
	flushSync(() => {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const tap = (element: Element) => flushSync(() => (element as HTMLElement).click());

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

/** The stored item the game is playing right now. */
const stored = (i = 0): StoredItem => progress.level(level.id)!.items[i];

/** Seeds the level with an exact list of items, bypassing the game's own random draw. */
function seed(items: StoredItem[], score: number | null = null) {
	progress.save(level.id, { items: items.map((item) => ({ ...item, difficulty: 0 })), score });
}

/** A letter guaranteed to differ from `letter`. */
const otherLetter = (letter: string) => (letter === 'a' ? 'b' : 'a');

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);
	index = wordIndex(story);

	const bySpelling = new Map<string, WordInSentence>();
	for (const entry of storyWords(story)) {
		if (entry.word.text.length < 2) continue;
		if (!bySpelling.has(entry.word.text)) bySpelling.set(entry.word.text, entry);
	}
	candidates = [...bySpelling.values()];
	entry = candidates.find((candidate) => candidate.word.text.length >= 3)!;
});

beforeEach(() => {
	progress.resetEverything();
});

describe('opening a level', () => {
	it('shows the masked "Grunnegs" sentence and the "Nederlands" translation', async () => {
		const container = await open();
		const entry = index.get(stored().source)!;

		expect(text(container)).toContain('Grunnegs');
		expect(text(container)).toContain(maskedPrompt(entry.sentence, entry.word));
		expect(text(container)).toContain('Nederlands');
		expect(text(container)).toContain(entry.word.dutch);
	});

	it('shows one box per letter, with the first one given for free and locked', async () => {
		const container = await open();
		const target = stored().target;
		const boxes = inputsOf(container);

		expect(boxes).toHaveLength(target.length);
		expect(boxes[0].value).toBe(target[0]);
		expect(boxes[0].readOnly).toBe(true);
	});

	it('shows "Versturen" only once every box has a letter', async () => {
		const container = await open();
		expect(button(container, 'Versturen')).toBeUndefined();

		const target = stored().target;
		const boxes = inputsOf(container);
		for (let i = 1; i < boxes.length; i++) typeInto(boxes[i], target[i]);

		expect(button(container, 'Versturen')).toBeDefined();
	});
});

describe('submitting an answer', () => {
	it('marks each box correct or wrong and reveals exactly one more locked letter on a wrong submit', async () => {
		seed(writingItems([entry]));
		const container = await open();
		const target = stored().target;
		const boxes = inputsOf(container);
		for (let i = 1; i < boxes.length; i++) typeInto(boxes[i], otherLetter(target[i]));
		tap(button(container, 'Versturen')!);

		// Two boxes show green: the letter given for free, and the one this wrong
		// submit just revealed - a locked box is always marked correct, which is
		// what the original does too (`setSolution` sets its status to true).
		// Every box the pupil still owns shows the wrong letter they typed.
		const wrappers = [...container.querySelectorAll('main span.relative')];
		expect(wrappers[0].className).toContain('border-accent');
		expect(wrappers[1].className).toContain('border-accent');
		for (let i = 2; i < wrappers.length; i++) {
			expect(wrappers[i].className).toContain('border-primary');
		}

		const boxesAfter = inputsOf(container);
		expect(boxesAfter[1].readOnly).toBe(true);
		expect(boxesAfter[1].value).toBe(target[1]);
		expect(boxesAfter[2].readOnly).toBe(false);
		// Not yet finished: still on the boxes, not the feedback card.
		expect(text(container)).not.toContain('Dat klopt!');
	});

	it('shows "Dat klopt!" and the word in read-only boxes on a correct submit', async () => {
		seed(writingItems([entry]));
		const container = await open();
		const target = stored().target;
		const boxes = inputsOf(container);
		for (let i = 1; i < boxes.length; i++) typeInto(boxes[i], target[i]);
		tap(button(container, 'Versturen')!);

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('Het juist geschreven woord is:');
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-accent'))).toBe(true);

		const readonlyBoxes = inputsOf(container).filter((input) => input.readOnly);
		expect(readonlyBoxes.map((input) => input.value)).toEqual(target);
	});

	it('completes the item by hint and shows "Jammer!" with a red cross', async () => {
		seed(writingItems([entry]));
		const container = await open();
		const target = stored().target;

		// Keep submitting a deliberately wrong attempt; each one hands out
		// another letter, until the hints alone finish the word.
		for (let round = 0; round < target.length; round++) {
			if (stored().responses.some((response) => response.join('') === target.join(''))) break;
			const boxes = inputsOf(container);
			for (let i = 0; i < boxes.length; i++) {
				if (!boxes[i].readOnly) typeInto(boxes[i], otherLetter(target[i]));
			}
			const submit = button(container, 'Versturen');
			if (!submit) break;
			tap(submit);
		}

		expect(text(container)).toContain('Jammer!');
		expect(text(container)).toContain('Het juist geschreven woord is:');
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-primary'))).toBe(true);
		// The extra mistake: the wrong attempt plus the completing response.
		expect(stored().responses.length).toBeGreaterThan(1);
	});
});

describe('coming back to a level', () => {
	it('restores exactly the letters a wrong attempt had already given away', async () => {
		const target = entry.word.text;
		const wrongAttempt = [...target].map((letter, i) => (i === 0 ? letter : otherLetter(letter)));
		const items = writingItems([entry]);
		items[0].responses = [wrongAttempt];
		seed(items);

		const container = await open();
		const boxes = inputsOf(container);

		// Free first letter, plus one hint from the recorded wrong attempt.
		expect(boxes[0].readOnly).toBe(true);
		expect(boxes[1].readOnly).toBe(true);
		expect(boxes[1].value).toBe(target[1]);
		// Anything past that was never given away, and the pupil's own earlier
		// (unsaved) guess is not restored either.
		expect(boxes[2].readOnly).toBe(false);
		expect(boxes[2].value).toBe('');
	});
});
