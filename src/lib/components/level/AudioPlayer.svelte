<script module lang="ts">
	/**
	 * The player's state, and with it the icon its button shows: an ellipsis
	 * while loading, play once ready, pause while playing, replay once
	 * finished. See `docs/original-app/games.md`.
	 */
	export type PlayerState = 'loading' | 'ready' | 'playing' | 'finished';
</script>

<script lang="ts">
	import { playClip, type PlaybackHandle } from '$lib/game/audio';
	import Ellipsis from '$lib/icons/ellipsis.svelte';
	import Pause from '$lib/icons/pause.svelte';
	import Play from '$lib/icons/play.svelte';
	import Replay from '$lib/icons/replay.svelte';
	import type { TimeRange } from '$lib/types';
	import { onDestroy } from 'svelte';

	interface Props {
		/** URL of the recording to play. */
		src: string;
		/**
		 * Restricts playback to this range of the recording, for a story
		 * fragment. The progress bar then fills over the range rather than over
		 * the whole recording, so a short fragment inside a long story still
		 * fills the bar edge to edge.
		 */
		range?: TimeRange;
		/**
		 * Whether to try playing as soon as the clip is ready, the way the
		 * original starts a level's recording unattended. The browser may
		 * refuse a play that was not triggered by a tap; when it does, the
		 * player falls back to the ready state instead of failing silently or
		 * throwing. See the "Autoplay" section in `$lib/game/audio` for the
		 * reasoning. There is also no volume warning here - the original's
		 * "Zet je geluid eerst wat luider" cannot be reproduced on the web and
		 * is deliberately not implemented; see `docs/rewrite.md`. Defaults to
		 * `false`.
		 */
		autoplay?: boolean;
		/** Called whenever the player's own state changes, if a caller needs it. */
		onstatechange?: (state: PlayerState) => void;
	}

	let { src, range, autoplay = false, onstatechange }: Props = $props();

	let current = $state<PlayerState>('loading');
	/** 0-1 fill of the progress bar, within `range` when there is one. */
	let progress = $state(0);
	let handle: PlaybackHandle | null = null;

	/**
	 * No icon-only button in the app had an accessible label before this one;
	 * the original conveyed its state through the icon shape alone. These are
	 * new copy, invented for this player rather than reused from anywhere.
	 */
	const labels: Record<PlayerState, string> = {
		loading: 'Geluid wordt geladen',
		ready: 'Speel het geluid af',
		playing: 'Geluid speelt af',
		finished: 'Speel het geluid opnieuw af'
	};

	function setState(next: PlayerState): void {
		current = next;
		onstatechange?.(next);
	}

	/**
	 * (Re)starts playback of the current clip, always attempting to play. Used
	 * both for the initial autoplay attempt and for a later tap on the ready or
	 * the replay icon, which is a real user gesture and should simply play.
	 */
	function start(): void {
		handle?.cancel();
		progress = 0;
		setState('loading');
		handle = playClip(src, {
			range,
			autoplay: true,
			onStart: () => setState('playing'),
			onProgress: (fraction) => {
				progress = fraction;
			}
		});
		handle.done.then((outcome) => {
			if (outcome === 'finished') {
				progress = 1;
				setState('finished');
			} else if (outcome === 'blocked') {
				// The ready-to-play fallback the module doc comment describes.
				setState('ready');
			}
			// 'cancelled': either a new playback already took over, or the player
			// is being torn down. Either way there is nothing left to show.
		});
	}

	/** Loads the clip without playing it, for a player that does not autoplay. */
	function preload(): void {
		handle?.cancel();
		progress = 0;
		setState('loading');
		handle = playClip(src, {
			range,
			autoplay: false,
			onReady: () => setState('ready')
		});
	}

	$effect(() => {
		// A new source or range replaces whatever clip was loaded before.
		// `autoplay` only governs this initial load; a tap afterwards always
		// plays, regardless of what it was set to.
		if (autoplay) start();
		else preload();
	});

	onDestroy(() => handle?.cancel());

	function onclick(): void {
		// Loading and playing have no defined tap behaviour in the original, so
		// the button is inert for them rather than guessing at a pause gesture
		// that was never specified.
		if (current === 'ready' || current === 'finished') start();
	}
</script>

<div class="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-lg">
	<!-- Decorative: the button's label already carries the state for a screen reader. -->
	<div class="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
		<div
			class="bg-secondary h-full rounded-full transition-[width]"
			style:width="{progress * 100}%"
		></div>
	</div>
	<button
		type="button"
		disabled={current === 'loading' || current === 'playing'}
		aria-label={labels[current]}
		{onclick}
		class="bg-secondary flex size-14 shrink-0 items-center justify-center rounded-full text-white transition
			enabled:hover:brightness-95 enabled:focus:brightness-95 disabled:opacity-70 [&>svg]:fill-white"
	>
		{#if current === 'loading'}
			<Ellipsis />
		{:else if current === 'ready'}
			<Play />
		{:else if current === 'playing'}
			<Pause />
		{:else}
			<Replay />
		{/if}
	</button>
</div>
