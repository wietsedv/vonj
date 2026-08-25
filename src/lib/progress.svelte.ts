/**
 * The pupil's progress: which levels have been played, with which items and
 * which score.
 *
 * One localStorage key per level, named after the level ("luisteren.woorden.
 * bragel"), plus `dataVersion` holding the content version the stored levels
 * were generated against. Nothing else is stored: the app is anonymous.
 *
 * localStorage does not exist during SSR and prerendering, so the store starts
 * out empty and `load()` fills it in after mount. Read `loaded` before
 * rendering anything that would otherwise flash a wrong value.
 */
import { browser } from '$app/environment';
import { allLevels, categoryLevels, sectionLevels } from '$lib/content';
import { dataVersion } from '$lib/content/version';
import * as storage from '$lib/storage';
import type { Answer, Category, Level, ScopeProgress, StoredItem, StoredLevel } from '$lib/types';

const VERSION_KEY = 'dataVersion';

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const isAnswer = (value: unknown): value is Answer =>
	Array.isArray(value) && value.every((token) => typeof token === 'string');

function isItem(value: unknown): value is StoredItem {
	if (typeof value !== 'object' || value === null) return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.source === 'string' &&
		typeof item.difficulty === 'number' &&
		isAnswer(item.target) &&
		Array.isArray(item.distractors) &&
		item.distractors.every(isAnswer) &&
		Array.isArray(item.responses) &&
		item.responses.every(isAnswer)
	);
}

/** Rejects anything that is not a level this version of the app can replay. */
function validateLevel(value: unknown): StoredLevel | null {
	if (typeof value !== 'object' || value === null) return null;
	const level = value as Record<string, unknown>;
	if (!Array.isArray(level.items) || !level.items.every(isItem)) return null;
	if (level.score !== null && typeof level.score !== 'number') return null;
	return { items: level.items, score: level.score };
}

const validateVersion = (value: unknown): number | null =>
	typeof value === 'number' ? value : null;

/* -------------------------------------------------------------------------- */
/* Items                                                                      */
/* -------------------------------------------------------------------------- */

const sameAnswer = (a: Answer, b: Answer) =>
	a.length === b.length && a.every((token, index) => token === b[index]);

/** An item is done once the most recent response is the target. */
export function isItemComplete(item: StoredItem): boolean {
	const last = item.responses.at(-1);
	return last !== undefined && sameAnswer(last, item.target);
}

/** Every attempt beyond the first one costs score. */
export const itemMistakes = (item: StoredItem): number => Math.max(0, item.responses.length - 1);

/* -------------------------------------------------------------------------- */
/* The store                                                                  */
/* -------------------------------------------------------------------------- */

const empty: ScopeProgress = { levels: 0, completed: 0, score: null };

class Progress {
	#levels = $state<Record<string, StoredLevel>>({});
	#loaded = $state(false);

	/** Whether localStorage has been read. False during SSR and before mount. */
	get loaded(): boolean {
		return this.#loaded;
	}

	/**
	 * Reads every stored level. Safe to call more than once; only the first call
	 * does anything. A content version mismatch discards everything, so a
	 * content update never leaves items pointing at material that is gone.
	 */
	load(): void {
		if (!browser || this.#loaded) return;

		if (storage.read(VERSION_KEY, validateVersion) !== dataVersion) {
			for (const level of allLevels()) storage.remove(level.id);
			storage.write(VERSION_KEY, dataVersion);
		}

		const levels: Record<string, StoredLevel> = {};
		for (const level of allLevels()) {
			const stored = storage.read(level.id, validateLevel);
			if (stored) levels[level.id] = stored;
		}
		this.#levels = levels;
		this.#loaded = true;
	}

	/** The stored state of one level, or null if it has never been opened. */
	level(id: string): StoredLevel | null {
		return this.#levels[id] ?? null;
	}

	/** The 0-6 score of a finished level, or null while it is unfinished. */
	score(id: string): number | null {
		return this.#levels[id]?.score ?? null;
	}

	/** Stores a level, after every answered item. */
	save(id: string, level: StoredLevel): void {
		this.#levels[id] = level;
		storage.write(id, level);
	}

	/** Progress over an arbitrary set of levels. */
	#scope(levels: Level[]): ScopeProgress {
		if (levels.length === 0) return empty;
		const scores = levels
			.map((level) => this.#levels[level.id]?.score)
			.filter((score): score is number => typeof score === 'number');
		const completed = scores.length;
		return {
			levels: levels.length,
			completed,
			// Stars only appear once every level of the scope has been played.
			score:
				completed === levels.length
					? scores.reduce((total, score) => total + score, 0) / completed
					: null
		};
	}

	section(category: Category, section: string): ScopeProgress {
		return this.#scope(sectionLevels(category, section));
	}

	category(category: Category): ScopeProgress {
		return this.#scope(categoryLevels(category));
	}

	everything(): ScopeProgress {
		return this.#scope(allLevels());
	}

	/**
	 * Throws away the score and the generated items of a set of levels, so
	 * replaying them draws a fresh selection of words and distractors.
	 */
	#reset(levels: Level[]): void {
		for (const level of levels) {
			delete this.#levels[level.id];
			storage.remove(level.id);
		}
	}

	resetLevel(id: string): void {
		delete this.#levels[id];
		storage.remove(id);
	}

	resetSection(category: Category, section: string): void {
		this.#reset(sectionLevels(category, section));
	}

	resetCategory(category: Category): void {
		this.#reset(categoryLevels(category));
	}

	resetEverything(): void {
		this.#reset(allLevels());
	}
}

export const progress = new Progress();
