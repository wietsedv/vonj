/**
 * Luisteren > Woorden met tijdslimiet, in a browser: the timer beside the
 * audio player, an expiry that reveals, plays and locks the next sound while
 * recording a response of its own, the auto-submit with "Jammer!" once every
 * sound has been given away, a wrong manual submit playing the word
 * recording only, a correct answer stopping the clock, and resuming a
 * half-answered item without re-charging what the clock already gave away.
 * See `docs/original-app/games.md`, "Luisteren > Woorden" and its timed
 * variant paragraph, and the file comment in
 * `LuisterenWoordenTijdslimiet.svelte` for why an expiry here differs from
 * the other two timed sections.
 *
 * The whole suite runs under `vi.useFakeTimers()`, installed before the
 * component ever mounts so the `Countdown` it creates is driven by the fake
 * clock from the start; `vi.waitFor` cannot be used to detect mounting under
 * fake timers, so `open()` instead yields the microtask queue directly, the
 * same way `SchrijvenWoordenTijdslimiet.svelte.test.ts` does.
 */
import LuisterenWoordenTijdslimiet from '$lib/components/games/LuisterenWoordenTijdslimiet.svelte';
import { getSection, loadStory, sectionLevels } from '$lib/content';
import { storyWords, type WordInSentence } from '$lib/game/generate';
import { gameRules } from '$lib/game/rules';
import { soundItems } from '$lib/game/words';
import { progress } from '$lib/progress.svelte';
import type { Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('luisteren', 'woorden-tijdslimiet')[0];
const section: Section = getSection('luisteren', 'woorden-tijdslimiet')!;
const secondsPerStep = gameRules('luisteren', 'woorden-tijdslimiet')!.secondsPerStep!;

let story: Story;
let candidates: WordInSentence[];
/**
 * A word of at least three sounds, so one expiry reveals a second sound
 * without completing the word by itself, and a resumed item can have one
 * sound already given and more than one still left. Assigned in `beforeAll`,
 * because a `describe` body runs at collection time, before it.
 */
let entry: WordInSentence;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Renders the game and waits, via the microtask queue rather than a timer, for it to mount. */
async function open() {
	const rendered = render(LuisterenWoordenTijdslimiet, {
		category: 'luisteren',
		section,
		level
	});
	const { container } = await rendered;
	for (let i = 0; i < 50 && container.querySelector('main')!.children.length === 0; i++) {
		await Promise.resolve();
	}
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

/** Advances the fake clock and flushes the resulting Svelte state into the DOM. */
const advance = (ms: number) => flushSync(() => vi.advanceTimersByTime(ms));

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	story = await loadStory(level.story);

	const bySpelling = new Map<string, WordInSentence>();
	for (const candidate of storyWords(story)) {
		if (candidate.word.text.length < 2) continue;
		if (!bySpelling.has(candidate.word.text)) bySpelling.set(candidate.word.text, candidate);
	}
	candidates = [...bySpelling.values()];
	entry = candidates.find((candidate) => candidate.word.sounds.length >= 3)!;
});

beforeEach(() => {
	vi.useFakeTimers();
	progress.resetEverything();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('opening a level', () => {
	it('renders the timer beside the audio player', async () => {
		seed(soundItems([entry]));
		const { container } = await open();

		const top = container.querySelector('main > div')!;
		expect(top.querySelector('[aria-label*="geluid" i]')).not.toBeNull();
		expect(text(top)).toMatch(/\d\d:\d\d/);
	});
});

describe('the clock', () => {
	it('reveals, plays and locks the next sound on expiry, and records a response for it', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;

		advance(secondsPerStep * 1000);

		const firstColumn = columns(container)[0];
		expect(field(firstColumn).textContent!.trim()).toBe(target[0]);
		expect(candidateButtons(firstColumn).every((b) => b.disabled)).toBe(true);
		expect(stored().responses).toHaveLength(1);
		expect(stored().responses[0][0]).toBe(target[0]);
	});

	it('auto-submits with "Jammer!" once every sound has been given away', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;

		advance(secondsPerStep * 1000 * target.length);

		expect(text(container)).toContain('Jammer!');
		expect(text(container)).toContain('De juiste uitspraak is:');
		const titleSpans = [...container.querySelectorAll('h2 span')];
		expect(titleSpans.some((span) => span.className.includes('fill-primary'))).toBe(true);
		// One response per expiry, plus one more for the auto-submit itself.
		expect(stored().responses).toHaveLength(target.length + 1);
		expect(stored().responses.at(-1)).toEqual(target);
	});

	it('plays only the word recording on a wrong manual submit, not the chosen sounds', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;

		// Selecting each candidate plays that candidate on its own (see
		// "Luisteren > Woorden" in docs/original-app/games.md), so the spy is
		// only installed once every column is chosen, to capture just the
		// playback that follows the submit itself.
		const wrongCandidate = (index: number, column: Element) =>
			candidateButtons(column).find((b) => text(b) !== target[index])!;
		for (const [index, column] of columns(container).entries()) tap(wrongCandidate(index, column));

		const playedSrcs: string[] = [];
		const originalPlay = HTMLMediaElement.prototype.play;
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
			this: HTMLMediaElement
		) {
			playedSrcs.push(this.src);
			return originalPlay.call(this).catch(() => undefined);
		});

		tap(button(container, 'Versturen')!);

		expect(playedSrcs.length).toBeGreaterThan(0);
		expect(playedSrcs[0]).toContain(entry.word.audio.replace(/\.[^.]+$/, ''));
		play.mockRestore();
	});

	it('stops the clock immediately on a correct manual submit', async () => {
		seed(soundItems([entry]));
		const { container } = await open();
		const target = stored().target;
		fillCorrectly(container, target);
		tap(button(container, 'Versturen')!);

		expect(text(container)).toContain('Dat klopt!');
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('coming back to a level', () => {
	it('does not re-charge a sound the clock already gave away', async () => {
		const target = entry.word.sounds;
		const alreadyGiven = 1;
		const partialAnswer = target.map((sound, index) => (index < alreadyGiven ? sound : ''));
		const items = soundItems([entry]);
		items[0].responses = [partialAnswer];
		seed(items);

		const { container } = await open();
		const firstColumn = columns(container)[0];
		expect(field(firstColumn).textContent!.trim()).toBe(target[0]);
		expect(candidateButtons(firstColumn).every((b) => b.disabled)).toBe(true);

		// Only `target.length - alreadyGiven` steps are left, so that many
		// expiries - not `target.length` many - finish the word.
		advance(secondsPerStep * 1000 * (target.length - alreadyGiven));
		expect(text(container)).toContain('Jammer!');
		// The one response already stored, plus one per remaining sound, plus
		// the auto-submit's own: nothing charged twice for the given sound.
		expect(stored().responses).toHaveLength(1 + (target.length - alreadyGiven) + 1);
	});
});

describe('tearing down', () => {
	it('leaves no interval running once the component is destroyed', async () => {
		seed(soundItems([entry]));
		const { unmount } = await open();
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
