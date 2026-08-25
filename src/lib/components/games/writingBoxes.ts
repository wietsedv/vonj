/**
 * Shared plumbing for the two writing games, `SchrijvenWoorden.svelte` and
 * `SchrijvenWoordenTijdslimiet.svelte`: both spell a word letter by letter in
 * `LetterBoxes`, built from the same items and marked the same way. What
 * differs between them - which letter starts out free, what counts as a hint
 * event, whether a wrong submit hands one out, whether an expiry costs score
 * - is specific to each game and lives there instead of here. See
 * `docs/original-app/games.md`, "Schrijven > Woorden" and its timed variant.
 */
import { selectWords, type WordInSentence } from '$lib/game/generate';
import type { GameRules } from '$lib/game/rules';
import { writingItems } from '$lib/game/words';
import type { LetterResult } from '$lib/components/level/LetterBoxes.svelte';
import type { Story, StoredItem } from '$lib/types';

export type { WordInSentence };

/** The items both writing games play on: up to ten words of the story. */
export function writingGenerate(story: Story, rules: GameRules): StoredItem[] {
	return writingItems(selectWords(story, rules.words!));
}

/**
 * The letters shown in the boxes: the target's own letter at a revealed
 * position (given for free or handed out as a hint), the pupil's own typed
 * guess everywhere else. `draft` and `locked` are always the same length as
 * `target`; a `draft` slot is blank until the pupil types into it.
 */
export function boxLetters(target: string, locked: boolean[], draft: string[]): string[] {
	return [...target].map((letter, index) => (locked[index] ? letter : (draft[index] ?? '')));
}

/** Whether every box has a letter, which is when "Versturen" may appear. */
export const isFilled = (letters: string[]): boolean =>
	letters.length > 0 && letters.every((letter) => letter !== '');

/** Per-letter verdict of a submitted attempt against the target spelling. */
export function markLetters(attempt: readonly string[], target: string): LetterResult[] {
	const letters = [...target];
	return attempt.map((letter, index) => (letter === letters[index] ? 'correct' : 'wrong'));
}
