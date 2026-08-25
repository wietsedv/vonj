/**
 * The countdown of a timed section: Luisteren > Woorden, Lezen > Zinnen and
 * Schrijven > Woorden all played "met tijdslimiet". See the "Timers" section
 * of `docs/original-app/games.md`.
 *
 * The clock runs for the current step (one sound, one sentence chunk, one
 * letter) of the item being played. Expiring never ends the level: it hands
 * the step over, which is why the game supplies `onexpire` rather than the
 * countdown deciding what "giving away a step" means. The countdown then
 * restarts for the next step, until every step has been given away, at which
 * point the item is done and `timeUp` becomes true. It is up to the game to
 * notice `timeUp` and submit the item; the countdown only tracks time.
 *
 * A correct answer stops the clock immediately (`stop()`), and a pupil who
 * fills in a step themselves shortens the item without the clock giving
 * anything away, which the game reports through `setSteps()`.
 */

/** How often the displayed seconds are refreshed. */
const TICK_MS = 1000;

export interface CountdownOptions {
	/** Seconds the clock gives per step. 15 or 20, from `gameRules(...).secondsPerStep`. */
	secondsPerStep: number;
	/** Steps still to be given away for this item, the one in progress included. */
	steps: number;
	/** Called once per expiring step, so the game can hand that step over. */
	onexpire: () => void;
}

export class Countdown {
	/** Seconds the clock gives per step, fixed for the life of the item. */
	readonly secondsPerStep: number;
	readonly #onexpire: () => void;

	#steps = $state(0);
	#secondsLeftInStep = $state(0);
	#running = $state(false);
	/** True only once the clock itself has given away the last step. */
	#timeUp = $state(false);

	/**
	 * Identifies the interval so it can be cleared. Not `$state`: it is
	 * bookkeeping for `stop()`, never read to render anything.
	 */
	#intervalId: ReturnType<typeof setInterval> | null = null;
	/**
	 * The wall-clock time (`Date.now()`) at which the current step reaches
	 * zero. Every tick recomputes `secondsLeftInStep` from `#deadline - now`
	 * instead of counting down from the previous tick, so a throttled or
	 * backgrounded tab that misses ticks catches up to the real time left
	 * instead of drifting behind it.
	 */
	#deadline = 0;

	constructor({ secondsPerStep, steps, onexpire }: CountdownOptions) {
		this.secondsPerStep = secondsPerStep;
		this.#onexpire = onexpire;
		this.#steps = Math.max(0, steps);
		this.#secondsLeftInStep = secondsPerStep;
		this.#timeUp = this.#steps === 0;
	}

	/** Seconds left in the step being counted down right now. */
	get secondsLeft(): number {
		return this.#secondsLeftInStep;
	}

	/**
	 * Seconds left for the whole item: this step, plus a full `secondsPerStep`
	 * for every step still to come after it.
	 */
	get totalSecondsLeft(): number {
		return this.#secondsLeftInStep + this.secondsPerStep * Math.max(0, this.#steps - 1);
	}

	/** Once every step has been given away by the clock: "Tijd is om!". */
	get timeUp(): boolean {
		return this.#timeUp;
	}

	/** Whether the interval is currently ticking. */
	get running(): boolean {
		return this.#running;
	}

	/** Starts, or resumes, the countdown. Safe to call while already running. */
	start(): void {
		if (this.#running || this.#timeUp) return;
		this.#running = true;
		this.#deadline = Date.now() + this.#secondsLeftInStep * 1000;
		this.#intervalId = setInterval(() => this.#tick(), TICK_MS);
	}

	/**
	 * Freezes the clock, most importantly on a correct answer. Clears the
	 * interval, so it is also how the game (or the component holding the
	 * countdown) tears one down; calling it twice, or on a countdown that was
	 * never started, does nothing.
	 */
	stop(): void {
		if (this.#intervalId !== null) {
			clearInterval(this.#intervalId);
			this.#intervalId = null;
		}
		this.#running = false;
	}

	/** Alias of `stop()` for call sites that clean up rather than pause. */
	destroy(): void {
		this.stop();
	}

	/**
	 * Tells the countdown how many steps are still to be given away, for when
	 * the pupil fills one in themselves and the item needs fewer hints than it
	 * did a moment ago. The step in progress keeps counting down unchanged:
	 * only the *total* (`totalSecondsLeft`) depends on this number, because the
	 * clock is already running toward the next hint regardless of how many are
	 * left after it. Bringing this to zero stops the clock, since there is
	 * nothing left to hint at, but does not set `timeUp` - the item was
	 * finished by the pupil, not given away by the clock.
	 */
	setSteps(steps: number): void {
		this.#steps = Math.max(0, steps);
		if (this.#steps === 0) {
			this.#secondsLeftInStep = 0;
			this.stop();
		}
	}

	#tick(): void {
		while (this.#running) {
			const remainingMs = this.#deadline - Date.now();
			if (remainingMs > 0) {
				this.#secondsLeftInStep = Math.ceil(remainingMs / 1000);
				return;
			}
			this.#expireStep();
		}
	}

	/** One step's clock has run out: hand it over and restart for the next. */
	#expireStep(): void {
		this.#steps = Math.max(0, this.#steps - 1);
		this.#onexpire();

		if (this.#steps === 0) {
			this.#secondsLeftInStep = 0;
			this.#timeUp = true;
			this.stop();
			return;
		}

		this.#secondsLeftInStep = this.secondsPerStep;
		this.#deadline = Date.now() + this.secondsPerStep * 1000;
	}
}

/** Formats a whole number of seconds as "mm:ss", for the timer card. */
export function formatSeconds(totalSeconds: number): string {
	const seconds = Math.max(0, Math.round(totalSeconds));
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}
