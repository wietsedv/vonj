/**
 * The items of the sentence-reordering games, on the real content set: how a
 * story is cut into rows, the starting order those rows show up in, and the
 * per-row markers a submitted order gets back. See
 * `docs/original-app/games.md`.
 */
import { loadStories, loadStory } from '$lib/content';
import {
	freeHeadStart,
	rowIndex,
	rowMarkers,
	sentenceItems,
	startingRows,
	targetText,
	timedGivenCount
} from '$lib/game/sentences';
import type { Story, StoredItem } from '$lib/types';
import { beforeAll, describe, expect, it } from 'vitest';

let stories: Story[];
let bragel: Story;

beforeAll(async () => {
	stories = await loadStories();
	bragel = await loadStory('bragel');
});

/** An item with a difficulty forced on it, as `LevelRun` would stamp it. */
const at = (item: StoredItem, difficulty: number) => ({ ...item, difficulty });

describe('the items of a level', () => {
	it('cuts sentences into chunks of three words, the last one allowed to be shorter', () => {
		// A hand-built fragment with one seven-word sentence: chunks of 3, 3, 1.
		const story: Story = {
			key: 'test',
			audio: 'a',
			image: 'i',
			fragments: [
				{
					key: 'test-1',
					time: [0, 10],
					image: 'i',
					sentences: [
						{
							key: 'test-1-1',
							text: 'ien twee trije veur vieve zesse zeuven',
							time: [0, 1],
							words: []
						}
					]
				}
			]
		};
		const index = rowIndex(story);
		// The sentence cuts into exactly three chunks (3, 3 and 1 words), which
		// never exceeds three mid-fragment but does reach the floor of three at
		// the end, so it becomes its own item; plus the whole-story item.
		const items = sentenceItems(story);
		expect(items).toHaveLength(2);
		expect(items[0].source).toBe('test-1');
		expect(items[0].target).toEqual(['test-1-1-0', 'test-1-1-3', 'test-1-1-6']);
		expect(items[1].source).toBe('test');

		// Split the chunks directly through the index to check the 3/3/1 cut.
		expect(index.get('test-1-1-0')).toBe('ien twee trije');
		expect(index.get('test-1-1-3')).toBe('veur vieve zesse');
		expect(index.get('test-1-1-6')).toBe('zeuven');
	});

	it('accumulates chunks across the sentences of a fragment and closes an item once more than three have accumulated', () => {
		// Sentence 1 contributes a single chunk (3 words), which alone is not
		// "more than three" chunks. Sentence 2 contributes three more (9
		// words). Only once the second sentence's chunks are added does the
		// running total (1 + 3 = 4) exceed three, closing both sentences'
		// chunks together as one item.
		const story: Story = {
			key: 'test',
			audio: 'a',
			image: 'i',
			fragments: [
				{
					key: 'test-1',
					time: [0, 10],
					image: 'i',
					sentences: [
						{ key: 's1', text: 'a b c', time: [0, 1], words: [] },
						{ key: 's2', text: 'd e f g h i j k l', time: [1, 2], words: [] }
					]
				}
			]
		};
		const items = sentenceItems(story);
		expect(items).toHaveLength(2); // the one chunk item, plus the whole-story item
		expect(items[0].source).toBe('test-1');
		expect(items[0].target).toEqual(['s1-0', 's2-0', 's2-3', 's2-6']);
	});

	it('keeps a trailing remainder of exactly three chunks as its own item', () => {
		const story: Story = {
			key: 'test',
			audio: 'a',
			image: 'i',
			fragments: [
				{
					key: 'test-1',
					time: [0, 10],
					image: 'i',
					sentences: [{ key: 's1', text: 'a b c d e f g h i', time: [0, 1], words: [] }]
				}
			]
		};
		// 9 words -> 3 chunks of 3; 3 is not "more than three" so it is never
		// closed mid-fragment, but it is kept as the fragment's own item because
		// it reaches the "at least three" floor at the end.
		const items = sentenceItems(story);
		expect(items).toHaveLength(2); // the chunk item, plus the whole-story item
		expect(items[0].target).toHaveLength(3);
	});

	it('drops a trailing remainder shorter than three chunks', () => {
		const story: Story = {
			key: 'test',
			audio: 'a',
			image: 'i',
			fragments: [
				{
					key: 'test-1',
					time: [0, 10],
					image: 'i',
					sentences: [{ key: 's1', text: 'a b c d e', time: [0, 1], words: [] }]
				}
			]
		};
		// 5 words -> chunks of 3 and 2; 2 never reaches the floor of three, so
		// this fragment contributes no chunk item at all.
		const items = sentenceItems(story);
		expect(items).toHaveLength(1);
		expect(items[0].source).toBe('test'); // only the whole-story item is left
	});

	it('plays a final item of the whole story, one row per fragment in story order', () => {
		const items = sentenceItems(bragel);
		const last = items[items.length - 1];
		expect(last.source).toBe(bragel.key);
		expect(last.target).toEqual(bragel.fragments.map((f) => f.key));
	});

	it('gives every item at least four rows, on the bragel story', () => {
		// Sanity check against a real story: every generated item, chunk items
		// and the whole-story item alike, has four rows or more. This is not a
		// hard guarantee of the algorithm in general - a fragment can end with
		// an exact three-chunk remainder, which does happen elsewhere in the
		// content set (zoepenbrij's first item has three rows) - it just holds
		// for this particular story.
		for (const item of sentenceItems(bragel)) {
			expect(item.target.length).toBeGreaterThanOrEqual(4);
		}
	});

	it('can still produce a shorter item when a fragment ends with an exact three-chunk remainder', () => {
		const zoepenbrij = stories.find((story) => story.key === 'zoepenbrij')!;
		const items = sentenceItems(zoepenbrij);
		expect(items[0].target).toHaveLength(3);
	});

	it('starts every item unanswered, with a placeholder difficulty', () => {
		for (const item of sentenceItems(bragel)) {
			expect(item.responses).toEqual([]);
			expect(item.difficulty).toBe(0);
		}
	});
});

describe('looking a row up by its key', () => {
	it('resolves every row of every item back to non-empty text', () => {
		for (const story of stories) {
			const index = rowIndex(story);
			for (const item of sentenceItems(story)) {
				for (const key of item.target) {
					expect(index.get(key)).toBeTruthy();
				}
			}
		}
	});

	it('resolves a fragment key to the full text of the fragment, not just its first sentence', () => {
		const fragment = bragel.fragments.find((f) => f.sentences.length > 1)!;
		const index = rowIndex(bragel);
		expect(index.get(fragment.key)).toBe(fragment.sentences.map((s) => s.text).join(' '));
	});
});

describe('the starting order of an item', () => {
	it('is a shuffle of the target', () => {
		for (const item of sentenceItems(bragel)) {
			expect([...item.distractors[0]].sort()).toEqual([...item.target].sort());
		}
	});

	it('is stable across calls once generated, so the list does not move around between visits', () => {
		const item = sentenceItems(bragel)[0];
		const first = startingRows(item, 0);
		for (let i = 0; i < 20; i++) {
			expect(startingRows(item, 0)).toEqual(first);
		}
	});

	it('puts the given rows at the top, in their correct order, ahead of the rest of the shuffle', () => {
		const item: StoredItem = {
			source: 'f',
			target: ['a', 'b', 'c', 'd'],
			distractors: [['c', 'a', 'd', 'b']],
			responses: [],
			difficulty: 0
		};
		expect(startingRows(item, 1)).toEqual(['a', 'c', 'd', 'b']);
		expect(startingRows(item, 2)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('is exactly the stored shuffle when nothing is given', () => {
		const item: StoredItem = {
			source: 'f',
			target: ['a', 'b', 'c', 'd'],
			distractors: [['c', 'a', 'd', 'b']],
			responses: [],
			difficulty: 0
		};
		expect(startingRows(item, 0)).toEqual(['c', 'a', 'd', 'b']);
	});
});

describe('the free head start', () => {
	it('gives a head start at difficulty 0 and below, and nothing at difficulty 1', () => {
		// docs/original-app/games.md: "at difficulty 0 or below the first chunk
		// is given and locked, at difficulty 1 nothing is given". The app's
		// actual formula (`1 - difficulty`) gives two rows at -1, not one; see
		// the comment on `freeHeadStart` for why this module follows the app.
		expect(freeHeadStart(0)).toBe(1);
		expect(freeHeadStart(1)).toBe(0);
		expect(freeHeadStart(-1)).toBe(2);
	});

	it('never goes negative for a difficulty above the range', () => {
		expect(freeHeadStart(9)).toBe(0);
	});
});

describe('the timed variant', () => {
	it('starts with nothing given, unlike the untimed head start', () => {
		expect(timedGivenCount(0, 5)).toBe(0);
	});

	it('locks one more row of the correct order per expiry', () => {
		expect(timedGivenCount(1, 5)).toBe(1);
		expect(timedGivenCount(2, 5)).toBe(2);
	});

	it('never locks past the number of rows the item has', () => {
		expect(timedGivenCount(9, 5)).toBe(5);
	});
});

describe('the per-row markers of a submitted order', () => {
	const item: StoredItem = {
		source: 'f',
		target: ['a', 'b', 'c', 'd'],
		distractors: [['a', 'b', 'c', 'd']],
		responses: [],
		difficulty: 0
	};

	it('marks a fully correct order correct throughout', () => {
		expect(rowMarkers(item, ['a', 'b', 'c', 'd'])).toEqual({
			a: 'correct',
			b: 'correct',
			c: 'correct',
			d: 'correct'
		});
	});

	it('marks a row that sits above its target position as having to move down', () => {
		// 'c' belongs at index 2 but was submitted at index 0: it sits above
		// where it should be, so it has to move down to get there.
		expect(rowMarkers(item, ['c', 'a', 'b', 'd']).c).toBe('down');
	});

	it('marks a row that sits below its target position as having to move up', () => {
		// 'a' belongs at index 0 but was submitted at index 2: it sits below
		// where it should be, so it has to move up to get there.
		expect(rowMarkers(item, ['c', 'a', 'b', 'd']).a).toBe('up');
	});

	it('leaves the rows already in place marked correct in a mixed-up order', () => {
		const markers = rowMarkers(item, ['c', 'a', 'b', 'd']);
		expect(markers.d).toBe('correct');
	});
});

describe('the correct text of an item', () => {
	it('is the rows of the item resolved in target order, for the feedback card', () => {
		const item = sentenceItems(bragel)[0];
		const index = rowIndex(bragel);
		expect(targetText(item, index)).toEqual(item.target.map((key) => index.get(key)));
	});

	it('falls back to an empty string for a key the index does not know', () => {
		const item: StoredItem = {
			source: 'f',
			target: ['missing'],
			distractors: [['missing']],
			responses: [],
			difficulty: 0
		};
		expect(targetText(item, new Map())).toEqual(['']);
	});
});

describe('a difficulty stamped onto an item, as LevelRun would', () => {
	it('does not change the stored target or distractors', () => {
		const item = sentenceItems(bragel)[0];
		const withDifficulty = at(item, 1);
		expect(withDifficulty.target).toEqual(item.target);
		expect(withDifficulty.distractors).toEqual(item.distractors);
	});
});
