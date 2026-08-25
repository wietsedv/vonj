/**
 * The numbers that differ per game.
 *
 * One entry per section, keyed the way a level key is: `<category>.<section>`.
 * Every value here is documented, in `docs/original-app/scoring.md` for the
 * tolerances and in `docs/original-app/games.md` for the rest. Nothing in this
 * table is invented; a game that wants a different number changes the docs
 * first.
 */
import type { Category } from '$lib/types';

/** How the difficulty of the next item follows from the current one. */
export interface DifficultyRules {
	/** The difficulty the first item of a level is presented at. */
	start: number;
	min: number;
	max: number;
}

/** Which words of a story a level draws its items from. */
export interface WordSelection {
	/** How many words a level uses at most. */
	count: number;
	/** Minimum length of the Gronings spelling, in characters. */
	minLetters?: number;
	/** Inclusive range of the number of sounds the word is built from. */
	sounds?: [min: number, max: number];
	/** Whether the word has to carry a Dutch translation. */
	dutch?: boolean;
}

export interface GameRules {
	/** Mistakes per item tolerated before the score reaches zero. */
	tolerance: number;
	/** Null for the games where difficulty controls nothing. */
	difficulty: DifficultyRules | null;
	/** Seconds the clock gives per hint step. Null for the untimed sections. */
	secondsPerStep: number | null;
	/** Null for the games that are not played on single words. */
	words: WordSelection | null;
}

/** Difficulty controls the number of options: 4, 5 or 6. */
const pictureDifficulty: DifficultyRules = { start: 0, min: 0, max: 2 };

/** Difficulty controls the number of candidate sounds per column: 2, 3 or 4. */
const soundDifficulty = (start: number): DifficultyRules => ({ start, min: 0, max: 2 });

/** Ten words of at least two letters, whatever they are made of. */
const anyWords: WordSelection = { count: 10, minLetters: 2 };

/** Ten translated words of a given length, for the three Spreken sections. */
const wordsOfLength = (min: number, max: number): WordSelection => ({
	count: 10,
	sounds: [min, max],
	dutch: true
});

const rules: Record<string, GameRules> = {
	'luisteren.verhaaltjes': {
		tolerance: 2,
		difficulty: pictureDifficulty,
		secondsPerStep: null,
		words: null
	},
	'luisteren.woorden': {
		tolerance: 3,
		difficulty: soundDifficulty(0),
		secondsPerStep: null,
		words: anyWords
	},
	'luisteren.woorden-tijdslimiet': {
		tolerance: 3,
		difficulty: soundDifficulty(0),
		secondsPerStep: 15,
		words: anyWords
	},
	'lezen.verhaaltjes': {
		tolerance: 2,
		difficulty: pictureDifficulty,
		secondsPerStep: null,
		words: null
	},
	// Difficulty controls the free head start: at 0 or below the first chunk is
	// given, at 1 nothing is.
	'lezen.zinnen': {
		tolerance: 3,
		difficulty: { start: 0, min: -1, max: 1 },
		secondsPerStep: null,
		words: null
	},
	'lezen.zinnen-tijdslimiet': {
		tolerance: 3,
		difficulty: { start: 0, min: -1, max: 1 },
		secondsPerStep: 20,
		words: null
	},
	// The writing games hand out their hints on a wrong answer or on the clock,
	// so nothing adapts.
	'schrijven.woorden': {
		tolerance: 3,
		difficulty: null,
		secondsPerStep: null,
		words: anyWords
	},
	'schrijven.woorden-tijdslimiet': {
		tolerance: 3,
		difficulty: null,
		secondsPerStep: 20,
		words: anyWords
	},
	// The section sets the starting difficulty, so a level of short words starts
	// with two candidates per column and one of long words with four.
	'spreken.korte-woorden': {
		tolerance: 3,
		difficulty: soundDifficulty(0),
		secondsPerStep: null,
		words: wordsOfLength(2, 3)
	},
	'spreken.normale-woorden': {
		tolerance: 3,
		difficulty: soundDifficulty(1),
		secondsPerStep: null,
		words: wordsOfLength(4, 6)
	},
	'spreken.lange-woorden': {
		tolerance: 3,
		difficulty: soundDifficulty(2),
		secondsPerStep: null,
		words: wordsOfLength(7, 10)
	}
};

/** The rules of one section, or null for a section that has none. */
export const gameRules = (category: Category, section: string): GameRules | null =>
	rules[`${category}.${section}`] ?? null;

/** Every section that has rules, as `<category>.<section>`. */
export const ruledSections = (): string[] => Object.keys(rules);
