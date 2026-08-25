/**
 * The building blocks the games generate their items from, on the real content
 * set. Nothing here is seeded, so the assertions are about what a draw may and
 * may not contain rather than about a particular draw.
 */
import { distractorSounds, loadStories, loadStory, sounds, storyKeys } from '$lib/content';
import {
	fragmentDistractors,
	pick,
	selectWords,
	shuffled,
	soundDistractors,
	storyDistractors,
	storyWords
} from '$lib/game/generate';
import { gameRules } from '$lib/game/rules';
import type { Story } from '$lib/types';
import { beforeAll, describe, expect, it } from 'vitest';

const REPEATS = 50;

let stories: Story[];
let bragel: Story;

beforeAll(async () => {
	stories = await loadStories();
	bragel = await loadStory('bragel');
});

describe('shuffled', () => {
	const items = [1, 2, 3, 4, 5, 6, 7, 8];

	it('keeps every item exactly once', () => {
		for (let i = 0; i < REPEATS; i++) {
			expect([...shuffled(items)].sort((a, b) => a - b)).toEqual(items);
		}
	});

	it('leaves the original alone', () => {
		shuffled(items);
		expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});

	it('does reorder', () => {
		const orders = new Set(Array.from({ length: REPEATS }, () => shuffled(items).join()));
		expect(orders.size).toBeGreaterThan(1);
	});
});

describe('pick', () => {
	it('takes as many as asked for', () => {
		expect(pick([1, 2, 3, 4, 5], 3)).toHaveLength(3);
	});

	it('never repeats an item', () => {
		const drawn = pick([1, 2, 3, 4, 5], 5);
		expect(new Set(drawn).size).toBe(5);
	});

	it('takes what there is when there is not enough', () => {
		expect(pick([1, 2], 6)).toHaveLength(2);
	});

	it('takes nothing for a count of zero or less', () => {
		expect(pick([1, 2, 3], 0)).toEqual([]);
		expect(pick([1, 2, 3], -1)).toEqual([]);
	});
});

describe('picture distractors', () => {
	it('draws fragments from every story, not just the one being played', () => {
		const target = bragel.fragments[0];
		const seen = new Set<string>();
		for (let i = 0; i < REPEATS; i++) {
			for (const fragment of fragmentDistractors(stories, target, 6)) seen.add(fragment.key);
		}
		const foreign = [...seen].filter((key) => !key.startsWith('bragel'));
		expect(foreign.length).toBeGreaterThan(0);
	});

	it('never offers the illustration that is the right answer', () => {
		for (const fragment of bragel.fragments) {
			for (let i = 0; i < 10; i++) {
				const drawn = fragmentDistractors(stories, fragment, 6);
				expect(drawn.map((option) => option.image)).not.toContain(fragment.image);
			}
		}
	});

	it('draws enough for the six options the hardest item shows', () => {
		expect(fragmentDistractors(stories, bragel.fragments[0], 5)).toHaveLength(5);
	});

	it('offers the other stories for the whole-story item, and only those', () => {
		const drawn = storyDistractors(stories, bragel);
		expect(drawn.map((story) => story.key).sort()).toEqual(
			storyKeys.filter((key) => key !== 'bragel').sort()
		);
	});
});

describe('sound distractors', () => {
	it('never offers the sound that is the right answer', () => {
		for (const sound of sounds) {
			for (let i = 0; i < 10; i++) {
				expect(soundDistractors(sound.sound, 4)).not.toContain(sound.sound);
			}
		}
	});

	it('never offers a sound that is kept out of the inventory', () => {
		const excluded = sounds.filter((sound) => sound.distractor === false).map((s) => s.sound);
		expect(excluded.length).toBeGreaterThan(0);

		const seen = new Set<string>();
		for (let i = 0; i < REPEATS; i++) {
			for (const sound of soundDistractors('aa', 4)) seen.add(sound);
		}
		for (const sound of excluded) expect(seen).not.toContain(sound);
	});

	it('draws enough for the four candidates a column can show', () => {
		expect(soundDistractors('aa', 3)).toHaveLength(3);
		expect(new Set(soundDistractors('aa', 3)).size).toBe(3);
	});

	it('has an inventory to draw from at all', () => {
		expect(distractorSounds.length).toBeGreaterThan(20);
	});
});

describe('the words of a story', () => {
	it('keeps the sentence a word came from', () => {
		for (const { word, sentence } of storyWords(bragel)) {
			expect(sentence.words).toContain(word);
		}
	});

	it('has words the content set does not spell out in their own sentence', () => {
		// Two dozen words across the four stories are listed under a sentence
		// whose text does not contain them, so the writing games cannot always
		// show the word in context. The original falls back to the bare dots; see
		// docs/original-app/games.md.
		const absent = stories.flatMap((story) =>
			storyWords(story).filter(
				(entry) => !entry.sentence.text.toLowerCase().includes(entry.word.text.toLowerCase())
			)
		);
		expect(absent.length).toBeGreaterThan(0);
	});

	it('lists a word once per time it is spoken', () => {
		const spoken = storyWords(bragel);
		const spellings = new Set(spoken.map((entry) => entry.word.text));
		expect(spoken.length).toBeGreaterThan(spellings.size);
	});
});

describe('selecting the words of a level', () => {
	const selection = { count: 10, minLetters: 2 };

	it('draws at most as many as the section asks for', () => {
		expect(selectWords(bragel, selection)).toHaveLength(10);
		expect(selectWords(bragel, { ...selection, count: 3 })).toHaveLength(3);
	});

	it('never draws the same spelling twice', () => {
		for (let i = 0; i < REPEATS; i++) {
			const drawn = selectWords(bragel, selection);
			expect(new Set(drawn.map((entry) => entry.word.text)).size).toBe(drawn.length);
		}
	});

	it('leaves out single-letter words, which have nothing to spell', () => {
		const short = storyWords(bragel).filter((entry) => entry.word.text.length < 2);
		expect(short.length).toBeGreaterThan(0);

		for (let i = 0; i < REPEATS; i++) {
			for (const entry of selectWords(bragel, selection)) {
				expect(entry.word.text.length).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it('draws a different set each time, so a replay is a fresh level', () => {
		const draws = new Set(
			Array.from({ length: REPEATS }, () =>
				selectWords(bragel, selection)
					.map((entry) => entry.word.text)
					.join()
			)
		);
		expect(draws.size).toBeGreaterThan(1);
	});

	it('can require a Dutch translation', () => {
		const untranslated = stories.flatMap((story) =>
			storyWords(story).filter((entry) => !entry.word.dutch)
		);
		expect(untranslated.length).toBeGreaterThan(0);

		for (const story of stories) {
			for (const entry of selectWords(story, { count: 100, dutch: true })) {
				expect(entry.word.dutch).toBeTruthy();
			}
		}
	});

	// docs/original-app/games.md, "Spreken > Korte, Normale en Lange woorden".
	const LENGTHS: [string, number, number][] = [
		['spreken.korte-woorden', 2, 3],
		['spreken.normale-woorden', 4, 6],
		['spreken.lange-woorden', 7, 10]
	];

	it.each(LENGTHS)('%s draws words of %i to %i sounds', (section, min, max) => {
		const words = gameRules('spreken', section.split('.')[1])?.words;
		expect(words?.sounds).toEqual([min, max]);

		for (const story of stories) {
			const drawn = selectWords(story, words!);
			expect(drawn.length).toBeGreaterThan(0);
			for (const entry of drawn) {
				expect(entry.word.sounds.length).toBeGreaterThanOrEqual(min);
				expect(entry.word.sounds.length).toBeLessThanOrEqual(max);
			}
		}
	});

	it('finds a full ten short and normal words in every story', () => {
		for (const story of stories) {
			expect(selectWords(story, gameRules('spreken', 'korte-woorden')!.words!)).toHaveLength(10);
			expect(selectWords(story, gameRules('spreken', 'normale-woorden')!.words!)).toHaveLength(10);
		}
	});
});
