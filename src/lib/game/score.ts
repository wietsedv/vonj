/**
 * Turning a played level into a score out of six.
 *
 * The only thing that counts is how many extra attempts the level needed, so a
 * flawless level always scores 6 and a level that used up its whole tolerance
 * scores 0. See `docs/original-app/scoring.md`.
 */
import { itemMistakes } from '$lib/progress.svelte';
import type { StoredItem } from '$lib/types';

/** The highest score a level can have, and the number stars are cut from. */
export const MAX_SCORE = 6;

/** Every extra attempt on any item of the level. */
export const levelMistakes = (items: StoredItem[]): number =>
	items.reduce((total, item) => total + itemMistakes(item), 0);

/**
 * The 0-6 score of a finished level. `tolerance` is how many mistakes per item
 * are tolerated before the score reaches zero.
 */
export function levelScore(items: StoredItem[], tolerance: number): number {
	// A level with nothing to get wrong cannot have been played badly.
	if (items.length === 0) return MAX_SCORE;

	const share = levelMistakes(items) / (items.length * tolerance);
	const score = Math.round(MAX_SCORE - share * MAX_SCORE);
	return Math.min(MAX_SCORE, Math.max(0, score));
}
