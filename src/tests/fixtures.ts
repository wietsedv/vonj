/**
 * Stored-progress fixtures. Levels hold generated items, so a fixture has to be
 * a real `StoredLevel` rather than just a score.
 */
import type { StoredItem, StoredLevel } from '$lib/types';

/** One generated item, answered right first time unless overridden. */
export function item(overrides: Partial<StoredItem> = {}): StoredItem {
	return {
		source: 'bragel-1',
		target: ['aa'],
		distractors: [['oo'], ['oe']],
		responses: [['aa']],
		difficulty: 1,
		...overrides
	};
}

/** A finished level with the given score, or an unfinished one when null. */
export const level = (score: number | null, items: StoredItem[] = [item()]): StoredLevel => ({
	items,
	score
});
