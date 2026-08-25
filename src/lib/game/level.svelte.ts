/**
 * Playing one level: the item loop every game runs on.
 *
 * A level's items are generated the first time it is opened and then stored, so
 * a run picks up exactly where it left off: the same items with the same
 * distractors, resumed at the first one not yet answered correctly. Everything
 * the pupil does goes through `respond` and `proceed`, which keep
 * `localStorage` up to date after every step.
 *
 * What an answer means, and what the game shows for it, is up to the game. The
 * run only cares whether the latest response equals the target.
 */
import type { GameRules } from '$lib/game/rules';
import { levelScore } from '$lib/game/score';
import { isItemComplete, progress } from '$lib/progress.svelte';
import type { Answer, Level, StoredItem, StoredLevel } from '$lib/types';

/** What a progress dot at the bottom of the screen shows. */
export type DotState = 'current' | 'correct' | 'wrong' | 'neutral';

export interface LevelRunOptions {
	level: Level;
	rules: GameRules;
	/**
	 * Builds the item list. Called when the level has never been played, and
	 * again on a replay, so it is expected to draw fresh words and distractors
	 * every time.
	 */
	generate: () => StoredItem[];
}

/** The index of the first item not yet answered correctly. */
const firstUnanswered = (items: StoredItem[]): number => {
	const index = items.findIndex((item) => !isItemComplete(item));
	// Every item answered but no score means the last "Doorgaan" never happened,
	// so the run resumes on the feedback of the last item.
	return index === -1 ? Math.max(0, items.length - 1) : index;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class LevelRun {
	readonly level: Level;
	readonly rules: GameRules;
	readonly #generate: () => StoredItem[];

	#stored: StoredLevel = $state({ items: [], score: null });
	#index = $state(0);
	#replayable = false;

	constructor({ level, rules, generate }: LevelRunOptions) {
		this.level = level;
		this.rules = rules;
		this.#generate = generate;

		// Generating over stored items would throw away someone's progress, so
		// never run before localStorage has been read. Loading twice is free.
		progress.load();

		const stored = progress.level(level.id);
		this.#replayable = stored?.score !== null && stored?.score !== undefined;
		this.#stored = stored && stored.items.length > 0 ? stored : this.#create();
		this.#index = firstUnanswered(this.#stored.items);
	}

	/** Generates a fresh item list, stamps the starting difficulty and stores it. */
	#create(): StoredLevel {
		const start = this.rules.difficulty?.start ?? 0;
		const items = this.#generate().map((item) => ({ ...item, difficulty: start }));
		const level: StoredLevel = { items, score: null };
		progress.save(this.level.id, level);
		return level;
	}

	#save(): void {
		progress.save(this.level.id, this.#stored);
	}

	/* ---------------------------------------------------------------------- */
	/* Where the run is                                                       */
	/* ---------------------------------------------------------------------- */

	get items(): StoredItem[] {
		return this.#stored.items;
	}

	/** 0-based position of the item being played. */
	get index(): number {
		return this.#index;
	}

	get item(): StoredItem {
		return this.#stored.items[this.#index];
	}

	/** The difficulty the current item is presented at. */
	get difficulty(): number {
		return this.item?.difficulty ?? 0;
	}

	/** The score of the level, or null while it is unfinished. */
	get score(): number | null {
		return this.#stored.score;
	}

	/** Whether the level is done and the result is what the screen shows. */
	get finished(): boolean {
		return this.#stored.score !== null;
	}

	/**
	 * Whether the current item has been answered, so the game shows its feedback
	 * card and the only thing left to do is "Doorgaan".
	 */
	get answered(): boolean {
		return this.item !== undefined && isItemComplete(this.item);
	}

	/** Whether the current item was answered right on the first attempt. */
	get firstTry(): boolean {
		return this.answered && this.item.responses.length === 1;
	}

	/**
	 * Whether the result screen may offer a replay. Only true for a level that
	 * was already finished when it was opened, so it never appears on the result
	 * of a level just played.
	 */
	get replayable(): boolean {
		return this.#replayable;
	}

	/** What the progress dot of item `index` shows. */
	dot(index: number): DotState {
		if (index === this.#index) return 'current';
		if (index > this.#index) return 'neutral';
		const item = this.#stored.items[index];
		if (!item || item.responses.length === 0) return 'neutral';
		return item.responses.length === 1 ? 'correct' : 'wrong';
	}

	/* ---------------------------------------------------------------------- */
	/* Playing                                                                */
	/* ---------------------------------------------------------------------- */

	/**
	 * Records one response to the current item. Every response counts, including
	 * the ones a timer hands out, which is what makes running the clock down cost
	 * score.
	 */
	respond(answer: Answer): void {
		if (this.finished || this.item === undefined) return;

		this.item.responses = [...this.item.responses, answer];
		if (isItemComplete(this.item)) this.#carryDifficulty();
		this.#save();
	}

	/**
	 * Sets the difficulty of the next item: up after a first-try answer, down
	 * after anything else. Only ever the next one, so difficulty cannot shift
	 * under the pupil's feet.
	 */
	#carryDifficulty(): void {
		const range = this.rules.difficulty;
		const next = this.#stored.items[this.#index + 1];
		if (!range || !next) return;

		const step = this.item.responses.length === 1 ? 1 : -1;
		next.difficulty = clamp(this.item.difficulty + step, range.min, range.max);
	}

	/**
	 * "Doorgaan": moves on to the next item, or finishes the level and computes
	 * its score when the current item was the last one.
	 */
	proceed(): void {
		if (this.finished) return;

		if (this.#index + 1 >= this.#stored.items.length) {
			this.#stored.score = levelScore(this.#stored.items, this.rules.tolerance);
			this.#save();
			return;
		}
		this.#index += 1;
	}

	/**
	 * "Dit level nog een keer spelen": throws the level away and starts a new one
	 * with freshly generated items.
	 */
	restart(): void {
		progress.resetLevel(this.level.id);
		this.#stored = this.#create();
		this.#index = 0;
	}
}
