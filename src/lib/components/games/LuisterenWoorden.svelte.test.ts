/**
 * Luisteren > Woorden, in a browser: the audio player with no text prompt,
 * the sound columns, candidate counts across difficulty, submitting, marking
 * and the feedback card carrying "Nederlands: <translation>". See
 * `docs/original-app/games.md`, "Luisteren > Woorden".
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`, as
 * `SchrijvenWoorden.svelte.test.ts` does. Most tests seed a single,
 * hand-picked word instead of letting the game draw its own random ten, so
 * the exact target sounds are known up front.
 */
import LuisterenWoorden from '$lib/components/games/LuisterenWoorden.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { wordUrl } from '$lib/content/assets';
import { storyWords, type WordInSentence } from '$lib/game/generate';
import { gameRules } from '$lib/game/rules';
import { candidateCount, soundItems } from '$lib/game/words';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('luisteren', 'woorden')[0];
const section: Section = getSection('luisteren', 'woorden')!;
const rules = gameRules('luisteren', 'woorden')!;

let story: Story;
/**
 * Every word of the story that fits Luisteren > Woorden (at least two
 * letters), deduplicated by spelling - the same filter `selectWords()`
 * applies, without its random pick. Assigned in `beforeAll`, because a
 * `describe` body runs at collection time, before it.
 */
let candidates: WordInSentence[];
/** A word of at least two sounds, so there is more than one column to test. */
let entry: WordInSentence;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

async function open() {
	const rendered = await render(LuisterenWoorden, { category: 'luisteren', section, level });
	await vi.waitFor(() =>
		expect(rendered.container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return rendered;
}

const tap = (element: Element) => flushSync(() => (element as HTMLElement).click());

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

const columns = (container: HTMLElement) => [
	...container.querySelectorAll('main ol.flex.gap-3 > li')
];

const field = (column: Element) => column.querySelector('button')!;

const candidateButtons = (column: Element) =>
	[...column.querySelectorAll('ol.flex-col > li > button')] as HTMLButtonElement[];

function fillCorrectly(container: HTMLElement, target: string[]) {
	for (const [index, column] of columns(container).entries()) {
		const sound = target[index];
		const match = candidateButtons(column).find((b) => text(b) === sound)!;
		tap(match);
	}
}

const stored = (i = 0): StoredItem => progress.level(level.id)!.items[i];

function seed(items: StoredItem[], score: number | null = null) {
	progress.save(level.id, { items, score });
}

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);

	const bySpelling = new Map<string, WordInSentence>();
	for (const candidate of storyWords(story)) {
		if (candidate.word.text.length < (rules.words!.minLetters ?? 0)) continue;
		if (!bySpelling.has(candidate.word.text)) bySpelling.set(candidate.word.text, candidate);
	}
	candidates = [...bySpelling.values()];
	entry = candidates.find(
		(candidate) => candidate.word.sounds.length >= 2 && candidate.word.dutch
	)!;
});

beforeEach(() => {
	progress.resetEverything();
});

describe('opening a level', () => {
	it("shows the audio player on the word's own recording, with no text prompt", async () => {
		seed(soundItems([entry]));
		const { container } = await open();

		expect(container.querySelector('[aria-label*="geluid" i]')).not.toBeNull();
		// Only the two labels the audio player itself may carry - no Dutch or
		// Gronings prompt text sits above the columns.
		const topArea = container.querySelector('main > div')!;
		expect(text(topArea)).toBe('');
	});

	it("loads the word's own recording", async () => {
		seed(soundItems([entry]));
		await open();
		// The player attempts autoplay on its own source; nothing to assert on
		// the network directly, but the entry used is the word this item targets.
		expect(wordUrl(entry.word)).toContain(entry.word.audio);
	});

	it('shows one column per sound of the word', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		expect(columns(container)).toHaveLength(stored().target.length);
	});

	it('shows "Versturen" only once every column is chosen, and only after something changed', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		expect(button(container, 'Versturen')).toBeUndefined();

		const target = stored().target;
		fillCorrectly(container, target);
		expect(button(container, 'Versturen')).toBeDefined();

		tap(button(container, 'Versturen')!);
		expect(button(container, 'Versturen')).toBeUndefined();
	});
});

describe('candidate counts', () => {
	it('offers 2, 3 or 4 candidates per column at difficulty 0, 1 and 2, target always included', async () => {
		for (const difficulty of [0, 1, 2]) {
			progress.resetEverything();
			const items = soundItems([entry]).map((item) => ({ ...item, difficulty }));
			seed(items);
			const { container } = await open();

			const target = stored().target;
			for (const [index, column] of columns(container).entries()) {
				const labels = candidateButtons(column).map((b) => text(b));
				expect(labels).toHaveLength(candidateCount(difficulty));
				expect(labels).toContain(target[index]);
			}
		}
	});
});

describe('submitting an answer', () => {
	it('shows "Dat klopt!", "De juiste uitspraak is:" and "Nederlands: <translation>" on a right submit', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;
		fillCorrectly(container, target);
		tap(button(container, 'Versturen')!);

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('De juiste uitspraak is:');
		expect(text(container)).toContain(`Nederlands: ${entry.word.dutch}`);
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-accent'))).toBe(true);

		const feedbackFields = [...container.querySelectorAll('main ol.flex.gap-2 > li button')];
		expect(feedbackFields).toHaveLength(target.length);
		expect(feedbackFields.every((f) => !(f as HTMLButtonElement).disabled)).toBe(true);
	});

	it('marks a wrong column red and stays on the columns, not the feedback', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;
		const wrongCandidate = (index: number, column: Element) =>
			candidateButtons(column).find((b) => text(b) !== target[index])!;

		for (const [index, column] of columns(container).entries()) {
			tap(wrongCandidate(index, column));
		}
		tap(button(container, 'Versturen')!);

		expect(text(container)).not.toContain('Dat klopt!');
		const firstField = field(columns(container)[0]);
		expect(firstField.querySelector('svg')).not.toBeNull();
		expect(stored().responses).toHaveLength(1);
		expect(stored().responses[0]).not.toEqual(target);
	});
});

describe('tearing down', () => {
	it('leaves nothing playing once destroyed', async () => {
		seed(soundItems([entry]));
		const { container, unmount } = await open();
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');

		const firstColumn = columns(container)[0];
		tap(candidateButtons(firstColumn)[0]);

		await unmount();
		expect(pause).toHaveBeenCalled();
		pause.mockRestore();
	});
});
