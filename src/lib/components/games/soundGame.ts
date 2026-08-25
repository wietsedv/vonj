/**
 * Shared logic for the five sound-column sections: Luisteren > Woorden (both
 * variants) and Spreken > Korte/Normale/Lange woorden. All five let the pupil
 * build a word's pronunciation one sound at a time in `SoundColumns.svelte`,
 * submit it, see it marked, and then hear their own answer played back
 * followed by the real recording. This module holds the pure, framework-free
 * pieces; each game file owns its own state (the current selection, the
 * playback handle, and - for the one timed section - the clock), the same way
 * `LezenZinnen.svelte` and `LezenZinnenTijdslimiet.svelte` each own their
 * state around the shared `sentenceRows.ts`.
 *
 * See `docs/original-app/games.md`, "Luisteren > Woorden", "Spreken > Korte,
 * Normale en Lange woorden", and "Items" / "Timers" under "Shared mechanics".
 */
import type { SoundColumn } from '$lib/components/level/SoundColumns.svelte';
import type { SoundFieldResult } from '$lib/components/level/SoundField.svelte';
import { getSound } from '$lib/content';
import { soundUrl } from '$lib/content/assets';
import { soundCandidates } from '$lib/game/words';
import type { Answer, StoredItem } from '$lib/types';

/** The recording of one Gronings sound, by its spelling in the content set. */
export function soundClipUrl(spelling: string): string {
	const sound = getSound(spelling);
	if (!sound) throw new Error(`No sound named "${spelling}" in the content set.`);
	return soundUrl(sound);
}

/** A column has a choice once it is either picked by the pupil or given away by the clock. */
export const isComplete = (chosen: readonly (string | null)[]): boolean =>
	chosen.every((sound) => sound !== null);

/** The chosen sounds as an `Answer`. An unset column is recorded as "", which can never equal a real sound. */
export const answerFrom = (chosen: readonly (string | null)[]): Answer =>
	chosen.map((sound) => sound ?? '');

/** Per-column correct/wrong marking of a submitted answer against the item's target. */
export const resultsFor = (answer: Answer, target: readonly string[]): SoundFieldResult[] =>
	target.map((sound, index) => (answer[index] === sound ? 'correct' : 'wrong'));

/**
 * The columns `SoundColumns.svelte` renders, from the item and the game's own
 * selection state. `locked` marks the columns the clock has already given
 * away - only the timed section ever passes any - and `results` is null
 * before the item's first submit and after any change to an unlocked column.
 */
export function buildColumns(
	item: StoredItem,
	chosen: readonly (string | null)[],
	results: readonly SoundFieldResult[],
	locked: readonly boolean[] = []
): SoundColumn[] {
	return item.target.map((_, index) => ({
		candidates: soundCandidates(item, index),
		chosen: chosen[index] ?? null,
		locked: locked[index] ?? false,
		result: results[index] ?? null
	}));
}

/**
 * The clips to play back after a submit: every chosen sound in turn, then the
 * word's own recording. `onItem`'s index lines up with `chosen` for every
 * index but the last, which is the word - see the games' `sounding` handling.
 */
export const answerPlaybackUrls = (
	chosen: readonly (string | null)[],
	wordAudioUrl: string
): string[] => [
	...chosen.filter((sound): sound is string => sound !== null).map(soundClipUrl),
	wordAudioUrl
];

/**
 * How many leading columns the timed section's clock may treat as already
 * given away when a level is reopened mid-item, so the countdown resumes
 * instead of re-revealing - and re-charging a response for - sounds the pupil
 * was already charged for. Derived from the item's most recent response: the
 * longest run of positions, starting from the first column, that already
 * matches the target.
 *
 * This is safe only because an expiry in that one section is stored as a
 * response like any other (see `docs/rewrite.md`, "The timed games do not
 * remember their clock", and `LuisterenWoordenTijdslimiet.svelte`): the
 * information a reveal handed out survives a reload even though the running
 * countdown itself does not. The other two timed sections cannot do this,
 * because an expiry there records nothing to recover.
 */
export function resumeGivenCount(item: StoredItem): number {
	const last = item.responses.at(-1);
	if (!last) return 0;
	let count = 0;
	while (count < item.target.length && last[count] === item.target[count]) count++;
	return count;
}
