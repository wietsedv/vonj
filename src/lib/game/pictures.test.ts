/**
 * The items of the picture-matching games, on the real content set: which
 * fragments become items, and which options an item shows at which difficulty.
 * See `docs/original-app/games.md`.
 */
import { loadStories, loadStory } from '$lib/content';
import {
	MAX_DISTRACTORS,
	fragmentIndex,
	fragmentItems,
	fragmentText,
	optionCount,
	pictureFragments,
	pictureOptions
} from '$lib/game/pictures';
import type { Story } from '$lib/types';
import { beforeAll, describe, expect, it } from 'vitest';

let stories: Story[];
let bragel: Story;

beforeAll(async () => {
	stories = await loadStories();
	bragel = await loadStory('bragel');
});

/** An item with a difficulty forced on it, as `LevelRun` would stamp it. */
const at = (difficulty: number) => ({ ...fragmentItems(bragel, stories)[0], difficulty });

describe('the items of a level', () => {
	it('plays one item per fragment of the story, in story order', () => {
		const items = fragmentItems(bragel, stories);
		expect(items.map((item) => item.source)).toEqual(pictureFragments(bragel).map((f) => f.key));
	});

	it('skips a fragment too short to be played on its own', () => {
		// docs/original-app/content.md: under two seconds is not an item.
		const short = {
			...bragel,
			fragments: [{ ...bragel.fragments[0], time: [0, 1.5] as [number, number] }]
		};
		expect(pictureFragments(short)).toEqual([]);
		expect(fragmentItems(short, stories)).toEqual([]);
	});

	it('answers an item with the fragment it was made from', () => {
		for (const item of fragmentItems(bragel, stories)) expect(item.target).toEqual([item.source]);
	});

	it('starts every item unanswered', () => {
		for (const item of fragmentItems(bragel, stories)) expect(item.responses).toEqual([]);
	});

	it('stores enough distractors for the widest grid, and no more', () => {
		for (const item of fragmentItems(bragel, stories)) {
			expect(item.distractors).toHaveLength(1);
			expect(item.distractors[0]).toHaveLength(MAX_DISTRACTORS);
			expect(MAX_DISTRACTORS + 1).toBe(optionCount(2));
		}
	});

	it('never stores the right answer as a distractor', () => {
		const byKey = fragmentIndex(stories);
		for (const item of fragmentItems(bragel, stories)) {
			const target = byKey.get(item.target[0])!;
			for (const key of item.distractors[0]) {
				expect(byKey.get(key)!.image).not.toBe(target.image);
			}
		}
	});
});

describe('the options of an item', () => {
	it('shows four, five or six of them as the difficulty rises', () => {
		expect([0, 1, 2].map((difficulty) => pictureOptions(at(difficulty)).length)).toEqual([4, 5, 6]);
	});

	it('stays inside that range for a difficulty outside it', () => {
		expect(pictureOptions(at(-1))).toHaveLength(4);
		expect(pictureOptions(at(9))).toHaveLength(6);
	});

	it('offers the right answer exactly once', () => {
		for (const item of fragmentItems(bragel, stories)) {
			for (const difficulty of [0, 1, 2]) {
				const options = pictureOptions({ ...item, difficulty });
				expect(options.filter((key) => key === item.target[0])).toHaveLength(1);
			}
		}
	});

	it('offers nothing twice', () => {
		for (const item of fragmentItems(bragel, stories)) {
			const options = pictureOptions({ ...item, difficulty: 2 });
			expect(new Set(options).size).toBe(options.length);
		}
	});

	it('takes its wrong options from the ones the item stored', () => {
		const item = at(2);
		for (const key of pictureOptions(item)) {
			if (key === item.target[0]) continue;
			expect(item.distractors[0]).toContain(key);
		}
	});

	it('does not put the answer in the same place every time', () => {
		const places = fragmentItems(bragel, stories).map((item) =>
			pictureOptions(item).indexOf(item.target[0])
		);
		expect(new Set(places).size).toBeGreaterThan(1);
	});

	it('keeps the same order every time it is asked, so answering never moves a card', () => {
		const item = at(1);
		const first = pictureOptions(item);
		for (let i = 0; i < 20; i++) {
			expect(pictureOptions({ ...item, responses: [['wrong']] })).toEqual(first);
		}
	});
});

describe('the text of an item', () => {
	it('is the first sentence of the fragment, not the whole fragment', () => {
		// ../vonj-app/app/pages/LevelReadStory.vue reads one sentence.
		const fragment = bragel.fragments.find((candidate) => candidate.sentences.length > 1)!;
		expect(fragmentText(fragment)).toBe(fragment.sentences[0].text);
	});

	it('is there for every item of every level', () => {
		for (const story of stories) {
			for (const fragment of pictureFragments(story)) {
				expect(fragmentText(fragment).length).toBeGreaterThan(0);
			}
		}
	});
});

describe('looking a fragment up by its key', () => {
	it('finds the fragments of every story, so a distractor resolves too', () => {
		const byKey = fragmentIndex(stories);
		for (const story of stories) {
			for (const fragment of story.fragments) expect(byKey.get(fragment.key)).toBe(fragment);
		}
	});
});
