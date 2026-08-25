/**
 * Luisteren > Verhaaltjes end to end, in a browser: the whole-story item, one
 * item per fragment, the recap, the picture grid, the "Helaas!" overlay, the
 * feedback, and that no Gronings text is ever rendered. See
 * `docs/original-app/games.md`, "Luisteren > Verhaaltjes".
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`, as
 * `LezenVerhaaltjes.svelte.test.ts` and `SchrijvenWoorden.svelte.test.ts` do.
 * Every test seeds the level with exact items via `progress.save()`, built
 * from `wholeStoryItem()`, `fragmentItems()` and `recapItem()` directly (the
 * same functions `pictureItems()` composes), so the target, the option order
 * and the recap's starting order are all known up front rather than drawn.
 *
 * This game autoplays on every item, not just after a user gesture, so an
 * unmocked `HTMLMediaElement.play()` would be refused by Chromium's autoplay
 * policy on a fresh page and start succeeding again once enough real,
 * gesture-backed plays have happened elsewhere in the browser session (see
 * `AudioPlayer.svelte.test.ts`'s doc comment). `HTMLMediaElement.play()` is
 * therefore mocked for the whole file to resolve immediately and record the
 * element it was called on, which is also what makes it possible to tell a
 * ranged play (`currentTime` seeked to the fragment's start) from an unranged
 * one without waiting on real playback.
 */
import LuisterenVerhaaltjes from '$lib/components/games/LuisterenVerhaaltjes.svelte';
import { getSection, loadStories, loadStory, sectionLevels } from '$lib/content';
import { animationUrl, imageUrl } from '$lib/content/assets';
import {
	fragmentIndex,
	fragmentItems,
	pictureFragments,
	recapItem,
	RECAP_GIVEN,
	storyIndex,
	wholeStoryItem
} from '$lib/game/pictures';
import { progress } from '$lib/progress.svelte';
import type { Fragment, Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const level: Level = sectionLevels('luisteren', 'verhaaltjes')[0];
const section: Section = getSection('luisteren', 'verhaaltjes')!;

let allStories: Story[];
let story: Story;
let fragmentsByKey: Map<string, Fragment>;
let storiesByKey: Map<string, Story>;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Every fragment key of `story`, in story order - the recap's target. */
const recapTarget = () => story.fragments.map((fragment) => fragment.key);

/**
 * The three item kinds of one level, in play order, exactly as
 * `pictureItems()` builds them but with the difficulty and the recap's
 * starting distractors pinned down for the test that asks for them.
 */
function buildItems(
	options: {
		storyDifficulty?: number;
		fragmentDifficulty?: number;
		recapDistractors?: string[];
	} = {}
): StoredItem[] {
	const whole = { ...wholeStoryItem(story, allStories), difficulty: options.storyDifficulty ?? 0 };
	const fragments = fragmentItems(story, allStories).map((item) => ({
		...item,
		difficulty: options.fragmentDifficulty ?? 0
	}));
	const recap = recapItem(story);
	if (options.recapDistractors) recap.distractors = [options.recapDistractors];
	return [whole, ...fragments, recap];
}

/** Marks the first `through` items as answered right first time, so the run resumes past them. */
function answered(items: StoredItem[], through: number): StoredItem[] {
	return items.map((item, index) =>
		index < through ? { ...item, responses: [[...item.target]] } : item
	);
}

/** Seeds the level with an exact list of items, bypassing the game's own random draw. */
function seed(items: StoredItem[], score: number | null = null) {
	progress.save(level.id, { items, score });
}

/** The stored item the game is playing right now. */
const stored = (index: number): StoredItem => progress.level(level.id)!.items[index];

/** Renders the level and waits for the game to have loaded its story. */
async function open() {
	const { container } = await render(LuisterenVerhaaltjes, {
		category: 'luisteren',
		section,
		level
	});
	await vi.waitFor(() =>
		expect(container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return container;
}

const cards = (container: HTMLElement) => [...container.querySelectorAll('main ul button')];

/** The card showing the whole-story overview illustration of `key`. */
const cardForStory = (container: HTMLElement, key: string) =>
	cards(container).find(
		(card) =>
			card.querySelector('img')!.getAttribute('src') === imageUrl(storiesByKey.get(key)!.image)
	);

/** The card showing the fragment illustration of `key`. */
const cardForFragment = (container: HTMLElement, key: string) =>
	cards(container).find(
		(card) =>
			card.querySelector('img')!.getAttribute('src') === imageUrl(fragmentsByKey.get(key)!.image)
	);

const tap = (element: Element | undefined) => flushSync(() => (element as HTMLElement).click());

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

/** Every Gronings sentence of `story`, for asserting none of it ever appears on screen. */
const groningsSentences = () =>
	story.fragments.flatMap((fragment) => fragment.sentences.map((s) => s.text));

const rendersNoGronings = (container: HTMLElement) => {
	const seen = container.textContent ?? '';
	return groningsSentences().every((sentence) => !seen.includes(sentence));
};

/** Every `HTMLMediaElement.play()` call since the last reset, in call order. */
let playCalls: HTMLMediaElement[] = [];

beforeAll(async () => {
	localStorage.clear();
	progress.load();
	allStories = await loadStories();
	story = await loadStory(level.story);
	fragmentsByKey = fragmentIndex(allStories);
	storiesByKey = storyIndex(allStories);

	// A recap with fewer than three fragments could shuffle into an order that
	// happens to still be correct; every story in the content set has more.
	expect(story.fragments.length).toBeGreaterThanOrEqual(3);

	vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
		this: HTMLMediaElement
	) {
		playCalls.push(this);
		return Promise.resolve();
	});
});

afterAll(() => {
	vi.restoreAllMocks();
});

beforeEach(() => {
	progress.resetEverything();
	playCalls = [];
});

describe('the level', () => {
	it('plays the whole-story item, then one item per fragment, then the recap, in order', async () => {
		seed(buildItems());
		const container = await open();

		// 1. The whole story: the four story overview illustrations.
		expect(cards(container)).toHaveLength(4);
		tap(cardForStory(container, stored(0).target[0]));
		tap(button(container, 'Doorgaan'));

		// 2. One item per fragment of at least two seconds.
		const fragmentCount = pictureFragments(story).length;
		for (let index = 1; index <= fragmentCount; index++) {
			const target = stored(index).target[0];
			expect(cardForFragment(container, target)).toBeDefined();
			tap(cardForFragment(container, target));
			tap(button(container, 'Doorgaan'));
		}

		// 3. The recap: every fragment illustration, including the short ones
		// that were never items of their own, as a reorder list.
		expect(container.querySelectorAll('main ul li')).toHaveLength(story.fragments.length);
	});

	it('never renders any Gronings text, on the picture items or their feedback', async () => {
		seed(buildItems());
		const container = await open();
		expect(rendersNoGronings(container)).toBe(true);

		tap(cardForStory(container, stored(0).target[0]));
		expect(rendersNoGronings(container)).toBe(true);

		tap(button(container, 'Doorgaan'));
		expect(rendersNoGronings(container)).toBe(true);
	});
});

describe('the whole-story item', () => {
	it('offers exactly four options, one per story, even at difficulty 2', async () => {
		seed(buildItems({ storyDifficulty: 2 }));
		const container = await open();

		expect(cards(container)).toHaveLength(4);
		for (const key of storiesByKey.keys()) {
			expect(cardForStory(container, key)).toBeDefined();
		}
	});
});

describe('a fragment item', () => {
	it("plays only the fragment's range, not the whole recording", async () => {
		seed(answered(buildItems(), 1));
		await open();
		await vi.waitFor(() => expect(playCalls.length).toBeGreaterThan(0));

		const fragment = fragmentsByKey.get(stored(1).target[0])!;
		expect(playCalls.at(-1)!.currentTime).toBeCloseTo(fragment.time[0], 1);
	});

	it.each([
		[0, 4],
		[1, 5],
		[2, 6]
	])('offers %s more options at difficulty %s -> %s options', async (difficulty, count) => {
		seed(answered(buildItems({ fragmentDifficulty: difficulty }), 1));
		const container = await open();
		expect(cards(container)).toHaveLength(count);
	});

	it('covers a wrong card with "Helaas!" and does not take it again', async () => {
		seed(answered(buildItems(), 1));
		const container = await open();
		const target = stored(1).target[0];
		const wrong = cards(container).find((card) => card !== cardForFragment(container, target))!;
		tap(wrong);

		expect(text(wrong)).toBe('Helaas!');
		expect((wrong as HTMLButtonElement).disabled).toBe(true);
		expect(stored(1).responses).toHaveLength(1);

		wrong.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(stored(1).responses).toHaveLength(1);
	});

	it('shows "Dat klopt!", "Het juiste antwoord was:" and the animated illustration on a right answer', async () => {
		seed(answered(buildItems(), 1));
		const container = await open();
		const target = stored(1).target[0];
		tap(cardForFragment(container, target));

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('Het juiste antwoord was:');
		expect(container.querySelector('main img')!.getAttribute('src')).toBe(
			animationUrl(fragmentsByKey.get(target)!.image)
		);
	});
});

describe('the recap', () => {
	it('renders every fragment illustration as an image row, with the first tile given and locked', async () => {
		const target = recapTarget();
		const items = buildItems({ recapDistractors: target });
		seed(answered(items, items.length - 1));
		const container = await open();

		const rows = [...container.querySelectorAll('main ul li')];
		expect(rows).toHaveLength(story.fragments.length);
		expect(rows.map((row) => row.querySelector('img')!.getAttribute('src'))).toEqual(
			target.map((key) => imageUrl(fragmentsByKey.get(key)!.image))
		);

		// The given tile has no drag handle and no move buttons.
		const givenRows = rows.slice(0, RECAP_GIVEN);
		const restRows = rows.slice(RECAP_GIVEN);
		for (const row of givenRows) {
			expect(row.querySelector('button[aria-label="Sleephandvat"]')).toBeNull();
			expect(row.querySelector('button[aria-label="Naar boven"]')).toBeNull();
		}
		for (const row of restRows) {
			expect(row.querySelector('button[aria-label="Sleephandvat"]')).not.toBeNull();
		}
	});

	it('shows the exact wrong-order message and marks each tile when the order is wrong', async () => {
		const target = recapTarget();
		const items = buildItems({ recapDistractors: [...target].reverse() });
		seed(answered(items, items.length - 1));
		const container = await open();

		tap(button(container, 'Versturen'));

		const alert = container.querySelector('[role="alert"]');
		expect(alert).not.toBeNull();
		expect(text(alert!)).toBe('Nog niet alle plaatjes staan op de juiste plaats');
		// Still working on the recap: the wrong order does not finish the item.
		expect(text(container)).not.toContain('Dat klopt!');
		expect(container.querySelectorAll('main ul li')).toHaveLength(story.fragments.length);
	});

	it('shows "Dat klopt!" and the animated story illustration, but no "Het juiste antwoord was:" line', async () => {
		const target = recapTarget();
		// The recap's starting order is the target itself: given tile plus the
		// rest of `distractors` in order, which is already the correct order.
		const items = buildItems({ recapDistractors: target });
		seed(answered(items, items.length - 1));
		const container = await open();

		tap(button(container, 'Versturen'));

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).not.toContain('Het juiste antwoord was:');
		expect(container.querySelector('main img')!.getAttribute('src')).toBe(
			animationUrl(story.image)
		);
	});
});

describe('cleanup', () => {
	it('leaves nothing playing once destroyed', async () => {
		seed(buildItems());
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');
		pause.mockClear();

		const { container, unmount } = await render(LuisterenVerhaaltjes, {
			category: 'luisteren',
			section,
			level
		});
		await vi.waitFor(() =>
			expect(container.querySelector('main')!.children.length).toBeGreaterThan(0)
		);
		await vi.waitFor(() => expect(playCalls.length).toBeGreaterThan(0));

		await unmount();
		expect(pause).toHaveBeenCalled();
		pause.mockRestore();
	});
});
