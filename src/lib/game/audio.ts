/**
 * Playing audio for the games: one clip, optionally restricted to a
 * `TimeRange`, or a cancellable sequence of clips played one after another.
 *
 * Every function here owns exactly one `HTMLAudioElement` for the lifetime of
 * the playback it starts, and always removes its listeners and pauses it again
 * once that playback is done, however it ended: it ran to completion, it was
 * cancelled, or the browser refused to start it. Nothing is ever left playing,
 * and no listener outlives the element it was attached to. Importing this
 * module has no side effects; nothing plays until `playClip` or `playSequence`
 * is called.
 *
 * ## Autoplay
 *
 * The original app starts the level's recording as soon as it is ready, with
 * no tap required. Browsers refuse audible playback that was not triggered by
 * a user gesture, so an unattended `play()` can be rejected. The settled
 * answer (see `docs/rewrite.md`) is: attempt it anyway, and treat a refusal as
 * a normal, distinguishable outcome rather than an error. `playClip` surfaces
 * this as the `'blocked'` outcome instead of a rejected promise, so a caller
 * such as `AudioPlayer.svelte` can fall back to a ready-to-play state instead
 * of breaking. In practice the tap that opened the level usually counts as the
 * gesture, so this mostly matters on a cold page load.
 *
 * There is no volume warning. The original showed "Zet je geluid eerst wat
 * luider" when the device volume was zero; the web platform has no API to read
 * it, and guessing would warn a pupil whose volume is already up, so the
 * warning is dropped rather than approximated.
 */
import type { TimeRange } from '$lib/types';

/**
 * How a playback attempt ended. `playClip` and `playSequence` never reject
 * their `done` promise; every way playback can stop, including the browser
 * refusing to start it, is one of these.
 */
export type PlaybackOutcome = 'finished' | 'cancelled' | 'blocked';

export interface PlayOptions {
	/**
	 * Restricts playback to this range of the file: seeks to `range[0]` before
	 * playing and stops at `range[1]` instead of running to the end of the
	 * file. Omit to play the whole file.
	 */
	range?: TimeRange;
	/**
	 * Whether to start playing immediately. Defaults to `true`. Pass `false` to
	 * load the clip and report readiness through `onReady` without making a
	 * `play()` call, which is how `AudioPlayer.svelte` shows the ready state
	 * without attempting autoplay.
	 */
	autoplay?: boolean;
	/**
	 * Called once the clip has loaded enough to play, before an autoplay
	 * attempt (if any) is made. With `autoplay: false` this is the only signal
	 * that the clip is ready.
	 */
	onReady?: () => void;
	/** Called once playback has actually started, i.e. after `play()` resolved. */
	onStart?: () => void;
	/**
	 * Called on every progress tick with how far playback has gone through the
	 * clip, or through `range` when one is given, as a 0-1 fraction.
	 */
	onProgress?: (fraction: number) => void;
}

export interface PlaybackHandle {
	/**
	 * Settles once this playback is done: `'finished'` when it ran to the end
	 * of the clip or of `range`, `'cancelled'` when `cancel()` was called, or
	 * `'blocked'` when the browser refused to start it. Stays pending forever
	 * for a clip loaded with `autoplay: false` that is never cancelled, since
	 * nothing has happened yet to settle it. Never rejects.
	 */
	readonly done: Promise<PlaybackOutcome>;
	/**
	 * Stops playback right away and settles `done` as `'cancelled'`. Safe to
	 * call at any time, including after playback has already finished or been
	 * blocked, in which case it does nothing.
	 */
	cancel(): void;
}

/** How far `audio.currentTime` is between `range[0]` and `range[1]`, as 0-1. */
function fractionThrough(audio: HTMLAudioElement, range?: TimeRange): number {
	const [start, end] = range ?? [0, audio.duration];
	const span = end - start;
	if (!Number.isFinite(span) || span <= 0) return 0;
	return Math.min(1, Math.max(0, (audio.currentTime - start) / span));
}

/**
 * Plays one clip. See `PlayOptions` and `PlaybackHandle` for the shape; the
 * module doc comment above covers why a refused autoplay attempt is a regular
 * outcome rather than a thrown error.
 */
export function playClip(url: string, options: PlayOptions = {}): PlaybackHandle {
	const { range, autoplay = true, onReady, onStart, onProgress } = options;

	const audio = new Audio(url);
	// Best-effort seek before metadata exists; harmless if the browser ignores
	// it, since `onLoadedMetadata` below seeks again once it can.
	if (range) audio.currentTime = range[0];

	let settled = false;
	let started = false;
	let resolveDone!: (outcome: PlaybackOutcome) => void;
	const done = new Promise<PlaybackOutcome>((resolve) => {
		resolveDone = resolve;
	});

	const removeListeners = () => {
		audio.removeEventListener('loadedmetadata', onLoadedMetadata);
		audio.removeEventListener('timeupdate', onTimeUpdate);
		audio.removeEventListener('ended', onEnded);
	};

	function finish(outcome: PlaybackOutcome) {
		if (settled) return;
		settled = true;
		removeListeners();
		audio.pause();
		resolveDone(outcome);
	}

	function attemptPlay() {
		if (settled || started) return;
		audio.play().then(
			() => {
				started = true;
				onStart?.();
			},
			// Rejected for two very different reasons that are indistinguishable
			// from here: an autoplay refusal, or `cancel()` having paused the
			// element while `play()` was still pending. Both are already handled -
			// the refusal becomes 'blocked' below, and a cancellation has already
			// settled `done`, so `finish` is a no-op by the time this runs.
			() => finish('blocked')
		);
	}

	function onLoadedMetadata() {
		if (range) audio.currentTime = range[0];
		onReady?.();
	}

	function onTimeUpdate() {
		if (settled) return;
		if (range && audio.currentTime >= range[1]) {
			onProgress?.(1);
			finish('finished');
			return;
		}
		onProgress?.(fractionThrough(audio, range));
	}

	function onEnded() {
		onProgress?.(1);
		finish('finished');
	}

	audio.addEventListener('loadedmetadata', onLoadedMetadata);
	audio.addEventListener('timeupdate', onTimeUpdate);
	audio.addEventListener('ended', onEnded);

	if (autoplay) attemptPlay();

	return {
		done,
		cancel: () => finish('cancelled')
	};
}

export interface SequenceHandle {
	/**
	 * Settles once the sequence is done: `'finished'` when every clip played to
	 * the end, `'cancelled'` when `cancel()` interrupted it, or `'blocked'` if
	 * the browser refused to play one. Never rejects.
	 */
	readonly done: Promise<PlaybackOutcome>;
	/** Stops the sequence right away, wherever it is. Safe to call at any time. */
	cancel(): void;
}

/**
 * Plays a list of URLs one after another, such as the sounds the pupil chose
 * followed by the real recording of the word. `onItem` fires with the index of
 * each clip as it starts playing, which is what a caller uses to scale that
 * sound up while it sounds. Selecting a different sound mid-playback is what
 * "interrupts" the sequence in `docs/original-app/games.md`: call `cancel()`
 * and start a new sequence.
 */
export function playSequence(urls: string[], onItem?: (index: number) => void): SequenceHandle {
	let cancelled = false;
	let current: PlaybackHandle | null = null;

	async function run(): Promise<PlaybackOutcome> {
		for (const [index, url] of urls.entries()) {
			if (cancelled) return 'cancelled';
			current = playClip(url, { onStart: () => onItem?.(index) });
			const outcome = await current.done;
			if (outcome !== 'finished') return outcome;
		}
		return 'finished';
	}

	return {
		done: run(),
		cancel: () => {
			cancelled = true;
			current?.cancel();
		}
	};
}
