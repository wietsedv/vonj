/**
 * Lezen > Verhaaltjes end to end, in a browser: the sentence card, the picture
 * grid, the "Helaas!" overlay, the feedback and the result. See
 * `docs/original-app/games.md`.
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`.
 */
import LezenVerhaaltjes from '$lib/components/games/LezenVerhaaltjes.svelte';
import { getSection, loadStories, loadStory, sectionLevels } from '$lib/content';
import { animationUrl, imageUrl } from '$lib/content/assets';
import { fragmentIndex, fragmentItems, fragmentText, pictureFragments } from '$lib/game/pictures';
import { progress } from '$lib/progress.svelte';
import type { Fragment, Level, Section, Story, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { learnIcons, stars } from '../../../tests/icons';

const level: Level = sectionLevels('lezen', 'verhaaltjes')[0];
const section: Section = getSection('lezen', 'verhaaltjes')!;

let stories: Story[];
let story: Story;
let byKey: Map<string, Fragment>;

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

/** Renders the level and waits for the game to have loaded its story. */
async function open() {
	const { container } = await render(LezenVerhaaltjes, { category: 'lezen', section, level });
	await vi.waitFor(() =>
		expect(container.querySelector('main')!.children.length).toBeGreaterThan(0)
	);
	return container;
}

const cards = (container: HTMLElement) => [...container.querySelectorAll('main ul button')];

/** The card showing the illustration of `key`. */
const cardFor = (container: HTMLElement, key: string) =>
	cards(container).find(
		(card) => card.querySelector('img')!.getAttribute('src') === imageUrl(byKey.get(key)!.image)
	);

const tap = (card: Element | undefined) => flushSync(() => (card as HTMLElement).click());

/** The stored item the game is playing right now. */
const stored = (index: number): StoredItem => progress.level(level.id)!.items[index];

/** Taps the right card of the item at `index`. */
const answer = (container: HTMLElement, index: number) =>
	tap(cardFor(container, stored(index).target[0]));

/** Taps a card that is not the right one. */
const answerWrong = (container: HTMLElement, index: number) =>
	tap(cards(container).find((card) => card !== cardFor(container, stored(index).target[0])));

const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('main button')].find((candidate) => text(candidate) === label);

beforeAll(async () => {
	localStorage.clear();
	await learnIcons();
	progress.load();
	stories = await loadStories();
	story = await loadStory(level.story);
	byKey = fragmentIndex(stories);
});

beforeEach(() => {
	progress.resetEverything();
});

describe('opening a level', () => {
	it('plays one item per fragment of its story', async () => {
		const container = await open();
		expect(progress.level(level.id)!.items).toHaveLength(pictureFragments(story).length);
		expect(container.querySelectorAll('footer ol > li')).toHaveLength(
			pictureFragments(story).length
		);
	});

	it('reads the first sentence of the fragment out in a card above the grid', async () => {
		const container = await open();
		expect(text(container.querySelector('main p')!)).toBe(
			fragmentText(byKey.get(stored(0).target[0])!)
		);
	});

	it('offers four pictures at the difficulty the section starts on', async () => {
		expect(cards(await open())).toHaveLength(4);
	});

	it('offers the right one among them', async () => {
		const container = await open();
		expect(cardFor(container, stored(0).target[0])).toBeDefined();
	});

	it('plays no audio at all', async () => {
		const container = await open();
		expect(container.querySelector('audio')).toBeNull();
	});
});

describe('picking a picture', () => {
	it('covers a wrong one with "Helaas!" and does not take it again', async () => {
		const container = await open();
		const wrong = cards(container).find(
			(card) => card !== cardFor(container, stored(0).target[0])
		)!;
		tap(wrong);

		expect(text(wrong)).toBe('Helaas!');
		expect((wrong as HTMLButtonElement).disabled).toBe(true);
		expect(stored(0).responses).toHaveLength(1);

		wrong.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(stored(0).responses).toHaveLength(1);
	});

	it('leaves the other cards alone', async () => {
		const container = await open();
		answerWrong(container, 0);
		expect(cards(container).filter((card) => text(card) === 'Helaas!')).toHaveLength(1);
	});

	it('shows the animated illustration as the answer to a right one', async () => {
		const container = await open();
		const target = stored(0).target[0];
		answer(container, 0);

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('Het juiste antwoord was:');
		expect(container.querySelector('main img')!.getAttribute('src')).toBe(
			animationUrl(byKey.get(target)!.image)
		);
	});

	it('keeps the sentence on screen while the answer is shown', async () => {
		const container = await open();
		const sentence = text(container.querySelector('main p')!);
		answer(container, 0);
		expect(text(container)).toContain(sentence);
	});

	it('records every attempt, so leaving keeps them', async () => {
		const container = await open();
		answerWrong(container, 0);
		answer(container, 0);

		const saved = JSON.parse(localStorage.getItem(level.id)!);
		expect(saved.items[0].responses).toHaveLength(2);
		expect(saved.items[0].responses[1]).toEqual([stored(0).target[0]]);
	});
});

describe('working through the level', () => {
	it('moves on to the next fragment on "Doorgaan"', async () => {
		const container = await open();
		answer(container, 0);
		expect(getComputedStyle(button(container, 'Doorgaan')!).cursor).toBe('pointer');
		tap(button(container, 'Doorgaan'));

		expect(text(container.querySelector('main p')!)).toBe(
			fragmentText(byKey.get(stored(1).target[0])!)
		);
		expect(cardFor(container, stored(1).target[0])).toBeDefined();
	});

	it('offers a picture more after a first-try answer, and one less after a mistake', async () => {
		const container = await open();
		answer(container, 0);
		tap(button(container, 'Doorgaan'));
		expect(cards(container)).toHaveLength(5);

		answerWrong(container, 1);
		answer(container, 1);
		tap(button(container, 'Doorgaan'));
		expect(cards(container)).toHaveLength(4);
	});

	it('finishes on the score, in stars', async () => {
		const container = await open();
		for (let index = 0; index < progress.level(level.id)!.items.length; index++) {
			answer(container, index);
			tap(button(container, 'Doorgaan'));
		}

		expect(text(container)).toContain('Goed gedaan!');
		expect(progress.score(level.id)).toBe(6);
		expect(stars(container.querySelector('main div.flex.justify-center')!)).toBe('full full full');
		expect(container.querySelectorAll('footer ol > li')).toHaveLength(0);
	});
});

describe('coming back to a level', () => {
	/** Puts a level into localStorage as an earlier visit would have left it. */
	const visited = (played: number, score: number | null = null) => {
		const items = fragmentItems(story, stories).map((item) => ({ ...item, difficulty: 0 }));
		for (const item of items.slice(0, played)) item.responses = [[...item.target]];
		progress.save(level.id, { items, score });
		return items;
	};

	it('replays the pictures it generated the first time', async () => {
		const items = visited(0);
		const container = await open();
		expect(stored(0).distractors).toEqual(items[0].distractors);
		expect(cards(container)).toHaveLength(4);
	});

	it('resumes on the first fragment not yet matched', async () => {
		visited(3);
		const container = await open();
		expect(text(container.querySelector('main p')!)).toBe(
			fragmentText(byKey.get(stored(3).target[0])!)
		);
	});

	it('opens a finished level on its result, with a replay', async () => {
		visited(8, 4);
		const container = await open();

		expect(text(container)).toContain('Goed gedaan!');
		expect(text(container)).toContain('Dit level nog een keer spelen');
		expect(cards(container)).toHaveLength(0);
	});

	it('starts over on fresh pictures when the replay is tapped', async () => {
		const items = visited(8, 4);
		const container = await open();
		tap(button(container, 'Dit level nog een keer spelen'));

		expect(progress.score(level.id)).toBeNull();
		expect(cards(container)).toHaveLength(4);
		expect(stored(0).responses).toEqual([]);
		// A fresh draw, so the distractors of the old run are gone.
		expect(stored(0).distractors).not.toEqual(items[0].distractors);
	});
});
