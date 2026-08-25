/**
 * The pupil's in-progress answer to one sound-column item: the chosen sound
 * per column, the last submit's per-column marking, and the playback of the
 * pupil's own answer afterwards. This is the state machine shared by all five
 * sound-column sections (`soundGame.ts` holds the pure per-column logic it is
 * built on); each game file owns one instance and drives it from its own
 * `$effect` on the current item, the same way each game elsewhere in this
 * directory owns its `Countdown` or its `order`/`draft` state directly.
 *
 * See `docs/original-app/games.md`, "Luisteren > Woorden" and "Spreken >
 * Korte, Normale en Lange woorden".
 */
import type { SoundColumn } from '$lib/components/level/SoundColumns.svelte';
import type { SoundFieldResult } from '$lib/components/level/SoundField.svelte';
import { playClip, playSequence, type PlaybackHandle, type SequenceHandle } from '$lib/game/audio';
import type { LevelRun } from '$lib/game/level.svelte';
import type { Answer, StoredItem } from '$lib/types';
import {
	answerFrom,
	answerPlaybackUrls,
	buildColumns,
	isComplete,
	resultsFor,
	soundClipUrl
} from './soundGame';

export interface SoundAnswerOptions {
	run: LevelRun;
	/** The word's own recording, for the end of every playback. Null while it is not yet known. */
	wordAudioUrl: () => string | null;
	/**
	 * Whether a WRONG submit still plays the pupil's chosen sounds before the
	 * word recording. True for every section except Luisteren > Woorden met
	 * tijdslimiet, where a wrong submit plays the word only - see "The three
	 * timed sections do not agree on what an expiry costs" and the "Timed
	 * variant" paragraph of "Luisteren > Woorden" in `docs/original-app/games.md`.
	 * Defaults to `true`.
	 */
	playChosenOnWrongSubmit?: boolean;
}

export class SoundAnswer {
	readonly #run: LevelRun;
	readonly #wordAudioUrl: () => string | null;
	readonly #playChosenOnWrongSubmit: boolean;

	#item: StoredItem | null = null;
	#playback: PlaybackHandle | SequenceHandle | null = null;

	chosen: (string | null)[] = $state([]);
	results: SoundFieldResult[] = $state([]);
	locked: boolean[] = $state([]);
	changed = $state(false);
	/** "Selecteer eerst alle klanken", shown after a submit attempted with an empty column. */
	incomplete = $state(false);
	/** Index of the column currently sounding in the answer playback, or null. */
	soundingIndex = $state<number | null>(null);

	constructor({ run, wordAudioUrl, playChosenOnWrongSubmit = true }: SoundAnswerOptions) {
		this.#run = run;
		this.#wordAudioUrl = wordAudioUrl;
		this.#playChosenOnWrongSubmit = playChosenOnWrongSubmit;
	}

	get complete(): boolean {
		return isComplete(this.chosen);
	}

	/** "Versturen" appears once every column has a choice and something changed since the last submit. */
	get canSubmit(): boolean {
		return this.complete && this.changed;
	}

	columns(item: StoredItem): SoundColumn[] {
		return buildColumns(item, this.chosen, this.results, this.locked);
	}

	/**
	 * Starts a fresh item: cancels whatever was playing, and seeds `chosen` and
	 * `locked` from `locked` (only the timed section ever passes any - see
	 * `resumeGivenCount()` in `soundGame.ts` for why it may be non-empty even
	 * on an item that was never touched this session).
	 */
	reset(item: StoredItem, locked: boolean[] = []): void {
		this.#playback?.cancel();
		this.#playback = null;
		this.#item = item;
		this.locked = locked;
		this.chosen = item.target.map((sound, index) => (locked[index] ? sound : null));
		this.results = item.target.map(() => null);
		this.changed = false;
		this.incomplete = false;
		this.soundingIndex = null;
	}

	/** Tapping a candidate: selects it and plays it. Interrupts whatever was sounding. */
	select(column: number, sound: string): void {
		if (this.locked[column]) return;
		this.#playback?.cancel();
		this.chosen = this.chosen.map((value, index) => (index === column ? sound : value));
		this.results = this.results.map((value, index) => (index === column ? null : value));
		this.changed = true;
		this.incomplete = false;
		this.soundingIndex = null;
		this.#playback = playClip(soundClipUrl(sound));
	}

	/** Tapping the display field: replays the sound already chosen for that column. */
	replay(column: number): void {
		const sound = this.chosen[column];
		if (!sound) return;
		this.#playback?.cancel();
		this.soundingIndex = null;
		this.#playback = playClip(soundClipUrl(sound));
	}

	/**
	 * Reveals column `index` as the clock gives it away: fills it with the
	 * target sound and locks it. The timed section calls this from its
	 * `Countdown`'s `onexpire`; nothing else ever locks a column.
	 */
	reveal(index: number): void {
		const item = this.#item;
		if (!item) return;
		this.chosen = this.chosen.map((value, i) => (i === index ? item.target[index] : value));
		this.locked = this.locked.map((value, i) => (i === index ? true : value));
	}

	/** The answer as it stands right now, for a caller recording it outside `submit()` (an expiry). */
	answer(): Answer {
		return answerFrom(this.chosen);
	}

	/**
	 * "Versturen": records the answer, marks every column, and plays it back.
	 * Does nothing but flag `incomplete` if a column is still empty - in
	 * practice unreachable, since the button only appears once every column
	 * has a choice (see "Alerts are inline messages, not dialogs" in
	 * `docs/rewrite.md`).
	 */
	submit(): void {
		const item = this.#item;
		if (!item) return;
		if (!this.complete) {
			this.incomplete = true;
			return;
		}

		const answer = answerFrom(this.chosen);
		this.#run.respond(answer);
		this.changed = false;
		this.incomplete = false;
		this.results = resultsFor(answer, item.target);

		this.#play(this.#run.answered);
	}

	/** Plays the answer back as if it had just been correctly submitted, for the timed section's auto-submit. */
	playAsCorrect(): void {
		this.#play(true);
	}

	#play(correct: boolean): void {
		this.#playback?.cancel();
		const wordAudioUrl = this.#wordAudioUrl();
		if (!wordAudioUrl) return;

		const playChosen = correct || this.#playChosenOnWrongSubmit;
		const urls = playChosen ? answerPlaybackUrls(this.chosen, wordAudioUrl) : [wordAudioUrl];
		const sequence = playSequence(urls, (index) => {
			this.soundingIndex = index < urls.length - 1 ? index : null;
		});
		this.#playback = sequence;
		sequence.done.then(() => {
			if (this.#playback === sequence) this.soundingIndex = null;
		});
	}

	/** Cancels any playback in progress. Call on teardown and whenever the item changes. */
	destroy(): void {
		this.#playback?.cancel();
		this.#playback = null;
	}
}
