/**
 * The items of the word games, on the real content set: the sound items of
 * Luisteren > Woorden and the three Spreken sections, and the writing items
 * of Schrijven > Woorden. See `docs/original-app/games.md`.
 */
import { loadStories, loadStory } from '$lib/content';
import { selectWords, storyWords } from '$lib/game/generate';
import { gameRules } from '$lib/game/rules';
import {
	MAX_DISTRACTORS,
	candidateCount,
	completedByHint,
	maskedPrompt,
	revealedPositions,
	soundCandidates,
	soundItems,
	wordIndex,
	writingItems
} from '$lib/game/words';
import type { Sentence, Story, Word } from '$lib/types';
import { beforeAll, describe, expect, it } from 'vitest';

let stories: Story[];
let bragel: Story;

beforeAll(async () => {
	stories = await loadStories();
	bragel = await loadStory('bragel');
});

/** Ten words of the story, in the shape `selectWords()` hands to the games. */
const words = () => selectWords(bragel, gameRules('luisteren', 'woorden')!.words!);

/** An item with a difficulty forced on it, as `LevelRun` would stamp it. */
const at = (difficulty: number) => ({ ...soundItems(words())[0], difficulty });

/**
 * An item for every word of every story, at one difficulty. `selectWords()`
 * draws at random, so anything asserting on how the slots are spread uses this
 * instead and reads the same on every run.
 */
const everyItemAt = (difficulty: number) =>
	soundItems(stories.flatMap((story) => storyWords(story))).map((item) => ({
		...item,
		difficulty
	}));

describe('the items of the sound games', () => {
	it('plays one item per selected word, in the order given', () => {
		const drawn = words();
		const items = soundItems(drawn);
		expect(items.map((item) => item.source)).toEqual(drawn.map((entry) => entry.word.key));
	});

	it('answers an item with the sounds of its word', () => {
		for (const entry of words()) {
			const [item] = soundItems([entry]);
			expect(item.target).toEqual(entry.word.sounds);
		}
	});

	it('starts every item unanswered', () => {
		for (const item of soundItems(words())) expect(item.responses).toEqual([]);
	});

	it('holds one distractor column per sound of the word', () => {
		for (const entry of words()) {
			const [item] = soundItems([entry]);
			expect(item.distractors).toHaveLength(entry.word.sounds.length);
		}
	});

	it('stores enough distractors for the widest column, and no more', () => {
		for (const item of soundItems(words())) {
			for (const column of item.distractors) {
				expect(column).toHaveLength(MAX_DISTRACTORS);
			}
			expect(MAX_DISTRACTORS + 1).toBe(candidateCount(2));
		}
	});

	it('never stores the right sound of a column as one of its own distractors', () => {
		for (const item of soundItems(words())) {
			item.target.forEach((sound, column) => {
				expect(item.distractors[column]).not.toContain(sound);
			});
		}
	});
});

describe('the candidates of a column', () => {
	it('shows two, three or four of them as the difficulty rises', () => {
		expect([0, 1, 2].map((difficulty) => candidateCount(difficulty))).toEqual([2, 3, 4]);
	});

	it('stays inside that range for a difficulty outside it', () => {
		expect(candidateCount(-1)).toBe(2);
		expect(candidateCount(9)).toBe(4);
	});

	it('offers the target sound of the column exactly once', () => {
		for (const item of soundItems(words())) {
			for (const difficulty of [0, 1, 2]) {
				const scored = { ...item, difficulty };
				item.target.forEach((sound, column) => {
					const candidates = soundCandidates(scored, column);
					expect(candidates.filter((candidate) => candidate === sound)).toHaveLength(1);
				});
			}
		}
	});

	it('offers nothing twice in a column', () => {
		for (const item of soundItems(words())) {
			const scored = { ...item, difficulty: 2 };
			item.target.forEach((_, column) => {
				const candidates = soundCandidates(scored, column);
				expect(new Set(candidates).size).toBe(candidates.length);
			});
		}
	});

	it('takes its wrong candidates from the ones the item stored', () => {
		const item = at(2);
		item.target.forEach((sound, column) => {
			for (const candidate of soundCandidates(item, column)) {
				if (candidate === sound) continue;
				expect(item.distractors[column]).toContain(candidate);
			}
		});
	});

	it('uses every slot, so the answer is never always in the same place', () => {
		// Every word of every story, not the random ten a level draws, so this is
		// the same answer on every run.
		const slots = new Set<number>();
		for (const item of everyItemAt(2)) {
			item.target.forEach((_, column) => {
				slots.add(soundCandidates(item, column).indexOf(item.target[column]));
			});
		}
		expect([...slots].sort()).toEqual([0, 1, 2, 3]);
	});

	it('rarely lands on the same slot in every column of one word', () => {
		// With four slots, two columns agree a quarter of the time by chance and a
		// longer word far less often, so some agreement is expected and fine. What
		// this rules out is the systematic kind: an earlier hash folded the column
		// in as a leading character, which put neighbouring columns a fixed
		// distance apart and made every column of 38% of the words agree.
		const long = everyItemAt(2).filter((item) => item.target.length >= 4);
		const agreeing = long.filter(
			(item) =>
				new Set(
					item.target.map((_, column) => soundCandidates(item, column).indexOf(item.target[column]))
				).size === 1
		);
		expect(long.length).toBeGreaterThan(100);
		expect(agreeing.length / long.length).toBeLessThan(0.05);
	});

	it('keeps the same order every time it is asked, so answering never moves a candidate', () => {
		const item = at(1);
		const first = item.target.map((_, column) => soundCandidates(item, column));
		for (let i = 0; i < 20; i++) {
			const again = { ...item, responses: [['wrong']] };
			item.target.forEach((_, column) => {
				expect(soundCandidates(again, column)).toEqual(first[column]);
			});
		}
	});
});

describe('the items of the writing games', () => {
	it('plays one item per selected word, in the order given', () => {
		const drawn = words();
		const items = writingItems(drawn);
		expect(items.map((item) => item.source)).toEqual(drawn.map((entry) => entry.word.key));
	});

	it('answers an item with the letters of the Gronings spelling', () => {
		for (const entry of words()) {
			const [item] = writingItems([entry]);
			expect(item.target).toEqual([...entry.word.text]);
			expect(item.target.join('')).toBe(entry.word.text);
		}
	});

	it('stores no distractors, since the writing games have no candidate list', () => {
		for (const item of writingItems(words())) expect(item.distractors).toEqual([]);
	});
});

describe('the masked prompt of a writing item', () => {
	it('replaces the word with one dot per letter, inside brackets, in the real sentence', () => {
		// docs/original-app/games.md's own example: bragel.json's first sentence.
		const fragment = bragel.fragments[0];
		const sentence = fragment.sentences.find((candidate) => candidate.text.includes('bragel'))!;
		const word = sentence.words.find((candidate) => candidate.text === 'bragel')!;
		expect(sentence.text).toBe('Over en deur bragel lopen.');
		expect(maskedPrompt(sentence, word)).toBe('Over en deur [......] lopen.');
	});

	it('never matches the word inside a longer word', () => {
		// "deur" must not match inside "deurlopen".
		const sentence: Sentence = {
			key: 'test',
			text: 'Ze mozzen deurlopen.',
			time: [0, 1],
			words: []
		};
		const word: Word = {
			key: 'w',
			text: 'deur',
			dutch: 'door',
			sounds: ['d', 'eu', 'r'],
			audio: 'deur'
		};
		expect(maskedPrompt(sentence, word)).toBe('[....]');
	});

	it('falls back to the dots on their own for a real word missing from its sentence', () => {
		// docs/original-app/games.md: about two dozen words in the content set are
		// listed under a sentence whose text does not contain them.
		let found: { sentence: Sentence; word: Word } | undefined;
		outer: for (const story of stories) {
			for (const entry of storyWords(story)) {
				if (!entry.sentence.text.toLowerCase().includes(entry.word.text.toLowerCase())) {
					found = { sentence: entry.sentence, word: entry.word };
					break outer;
				}
			}
		}
		expect(found).toBeDefined();
		expect(maskedPrompt(found!.sentence, found!.word)).toBe(
			`[${'.'.repeat(found!.word.text.length)}]`
		);
	});

	it('matches case-insensitively', () => {
		const sentence: Sentence = {
			key: 'test',
			text: 'BRAGEL is een dorp.',
			time: [0, 1],
			words: []
		};
		const word: Word = { key: 'w', text: 'bragel', dutch: 'bragel', sounds: [], audio: 'bragel' };
		expect(maskedPrompt(sentence, word)).toBe('[......] is een dorp.');
	});
});

describe('which letters a writing item reveals', () => {
	it('gives the untimed game a free first letter, and one more per wrong attempt', () => {
		expect(revealedPositions(4, true, 0)).toEqual([true, false, false, false]);
		expect(revealedPositions(4, true, 1)).toEqual([true, true, false, false]);
		expect(revealedPositions(4, true, 3)).toEqual([true, true, true, true]);
	});

	it('gives the timed game nothing for free, one more per expiry', () => {
		expect(revealedPositions(4, false, 0)).toEqual([false, false, false, false]);
		expect(revealedPositions(4, false, 1)).toEqual([true, false, false, false]);
		expect(revealedPositions(4, false, 4)).toEqual([true, true, true, true]);
	});

	it('never reveals more letters than the word has', () => {
		expect(revealedPositions(3, true, 99)).toEqual([true, true, true]);
		expect(revealedPositions(3, false, 99)).toEqual([true, true, true]);
	});

	it('says the word is complete only once every letter is revealed', () => {
		expect(completedByHint(4, true, 2)).toBe(false);
		expect(completedByHint(4, true, 3)).toBe(true);
		expect(completedByHint(4, false, 3)).toBe(false);
		expect(completedByHint(4, false, 4)).toBe(true);
	});
});

describe('looking a word up by its key', () => {
	it('resolves a real item source back to its word and sentence', () => {
		const byKey = wordIndex(bragel);
		for (const entry of storyWords(bragel)) {
			expect(byKey.get(entry.word.key)).toEqual(entry);
		}
	});

	it('finds every word used by a level of the sound game', () => {
		const byKey = wordIndex(bragel);
		for (const item of soundItems(words())) {
			expect(byKey.get(item.source)?.word.sounds).toEqual(item.target);
		}
	});
});
