/**
 * The word games: turning the words a level was given by `selectWords()` (in
 * `$lib/game/generate`) into items, and answering the per-difficulty
 * questions each game family asks of them.
 *
 * Six sections play on single words and share this module:
 * - the sound games, which reconstruct which Gronings sounds a word is made
 *   of: Luisteren > Woorden (with its timed variant) and the three Spreken
 *   sections;
 * - the writing games, which spell a word letter by letter: Schrijven >
 *   Woorden and its timed variant.
 *
 * See `docs/original-app/games.md`, sections "Luisteren > Woorden",
 * "Spreken > Korte, Normale en Lange woorden" and "Schrijven > Woorden", plus
 * "Items", "Adaptive difficulty" and "Timers" under "Shared mechanics".
 */
import { soundDistractors, storyWords, type WordInSentence } from '$lib/game/generate';
import type { Sentence, StoredItem, Story, Word } from '$lib/types';

/* -------------------------------------------------------------------------- */
/* Shared: looking a word up by its item's source key                        */
/* -------------------------------------------------------------------------- */

/**
 * Every word of a story by key, together with the sentence it came from, for
 * turning an item's `source` back into what a game needs to show or play:
 * the word's recording, its Dutch translation, or the sentence to mask.
 * Exactly what `fragmentIndex()` does for fragments in pictures.ts.
 */
export const wordIndex = (story: Story): Map<string, WordInSentence> =>
	new Map(storyWords(story).map((entry) => [entry.word.key, entry]));

/* -------------------------------------------------------------------------- */
/* The sound games: Luisteren > Woorden, Spreken x3                          */
/* -------------------------------------------------------------------------- */

/**
 * The widest column shows four candidates, so three distractors are stored
 * per column, the way `MAX_DISTRACTORS` does in pictures.ts.
 */
export const MAX_DISTRACTORS = 3;

/**
 * One item per selected word, in the order `selectWords()` gave them. `target`
 * is the word's sounds, one per column; `distractors` holds one candidate
 * list per column, drawn from the whole sound inventory. `difficulty` is a
 * placeholder that `LevelRun` stamps over, exactly as `fragmentItems` leaves
 * it at 0 in pictures.ts.
 */
export function soundItems(words: readonly WordInSentence[]): StoredItem[] {
	return words.map(({ word }) => ({
		source: word.key,
		target: word.sounds,
		distractors: word.sounds.map((sound) => soundDistractors(sound, MAX_DISTRACTORS)),
		responses: [],
		difficulty: 0
	}));
}

/** How many candidates a column shows: 2 at difficulty 0, 3 at 1, 4 at 2. */
export const candidateCount = (difficulty: number): number =>
	2 + Math.min(Math.max(difficulty, 0), 2);

/**
 * Where the target sound sits among a column's candidates. Derived from the
 * item and the column instead of drawn, for the same reason
 * `targetPosition()` in pictures.ts is: reopening a level, or a wrong answer,
 * must never move a candidate out from under the pupil's finger.
 *
 * This mixes harder than the `hash * 31 % 1000003` of pictures.ts, which is
 * deliberate. A picture item has one grid, so its hash only has to be spread
 * over items; here every column of one word draws a slot, and a weak mix put
 * the whole word's answers in the same slot far more often than chance: with
 * the column folded in as a leading character, neighbouring columns landed a
 * fixed distance apart, so for 38% of the words in the content set every
 * column agreed. A child would notice "the answer is always the top one".
 *
 * FNV-1a over the source, the column folded in after it, then the murmur3
 * finalizer to avalanche the low bits that `% count` actually reads.
 */
function targetPosition(item: StoredItem, column: number, count: number): number {
	let hash = 2166136261;
	for (let i = 0; i < item.source.length; i++) {
		hash = Math.imul(hash ^ item.source.charCodeAt(i), 16777619);
	}
	hash = Math.imul(hash ^ column, 16777619);

	hash ^= hash >>> 16;
	hash = Math.imul(hash, 2246822507);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 3266489909);
	hash ^= hash >>> 16;

	return (hash >>> 0) % count;
}

/**
 * The candidate sounds of one column of an item, in the order they are shown:
 * as many of the stored distractors as the item's difficulty asks for, with
 * the target sound among them.
 */
export function soundCandidates(item: StoredItem, column: number): string[] {
	const target = item.target[column];
	const distractors = item.distractors[column] ?? [];
	const count = Math.min(candidateCount(item.difficulty), distractors.length + 1);
	const candidates = distractors.slice(0, count - 1);
	candidates.splice(targetPosition(item, column, count), 0, target);
	return candidates;
}

/* -------------------------------------------------------------------------- */
/* The writing games: Schrijven > Woorden                                    */
/* -------------------------------------------------------------------------- */

/**
 * One item per selected word, to be typed letter by letter. `target` is the
 * word's letters, one per position. There are no distractors: `rules.ts` has
 * `difficulty: null` for both Schrijven sections, because their hints come
 * from a wrong answer or from the clock, not from a candidate list.
 */
export function writingItems(words: readonly WordInSentence[]): StoredItem[] {
	return words.map(({ word }) => ({
		source: word.key,
		target: [...word.text],
		distractors: [],
		responses: [],
		difficulty: 0
	}));
}

/** Escapes a string for literal use inside a `RegExp`. */
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The prompt shown for a writing item: the sentence its word came from, with
 * the word itself replaced by a bracketed run of dots, one per letter -
 * "Over en deur [......] lopen." Matching is case-insensitive, and only
 * matches the word as a whole word so it can never match inside a longer one
 * (matching "deur" inside "deurlopen", for instance).
 *
 * Two dozen words in the content set are listed under a sentence whose text
 * does not contain them (docs/original-app/games.md); for those there is
 * nothing to replace, so this returns the dots on their own.
 */
export function maskedPrompt(sentence: Sentence, word: Word): string {
	const dots = `[${'.'.repeat([...word.text].length)}]`;
	const pattern = new RegExp(`(^|\\P{L})${escapeRegExp(word.text)}($|\\P{L})`, 'iu');
	const match = pattern.exec(sentence.text);
	if (!match) return dots;

	const start = match.index + match[1].length;
	const end = start + word.text.length;
	return sentence.text.slice(0, start) + dots + sentence.text.slice(end);
}

/**
 * Which of a word's letter positions are revealed and locked, from the start,
 * given how many hint events have happened. Both writing games reveal one
 * more letter per event; they differ only in what counts as an event and in
 * whether the first letter starts out free:
 *
 * - untimed (Schrijven > Woorden): the first letter is free, and `events` is
 *   the number of wrong submits so far.
 * - timed (Schrijven > Woorden met tijdslimiet): nothing is free, and
 *   `events` is the number of timer expiries so far - a wrong submit is
 *   never an event there, only the clock hands out hints.
 *
 * The result never reveals more letters than the word has, however large
 * `events` gets, which is what happens once the clock has handed the whole
 * word over.
 */
export function revealedPositions(
	wordLength: number,
	freeFirstLetter: boolean,
	events: number
): boolean[] {
	const revealed = Math.min(wordLength, (freeFirstLetter ? 1 : 0) + Math.max(0, events));
	return Array.from({ length: wordLength }, (_, position) => position < revealed);
}

/**
 * Whether every letter of the word has been given away as a hint. When the
 * hint that completes the word is what makes the item complete, the item
 * still counts as complete, but the feedback card says "Jammer!" instead of
 * "Dat klopt!" - it is the game's call to make that comparison against
 * whether the pupil's own submitted answer was already correct; this only
 * answers whether hints alone account for the whole word.
 */
export const completedByHint = (
	wordLength: number,
	freeFirstLetter: boolean,
	events: number
): boolean => revealedPositions(wordLength, freeFirstLetter, events).every(Boolean);
