<script lang="ts">
	/**
	 * The timer card for the three "met tijdslimiet" sections. Sits in the level
	 * shell's "top" area: next to the play button for Luisteren > Woorden and
	 * alone for the other two (see `docs/original-app/level-shell.md`). It only
	 * renders numbers a `Countdown` (`$lib/game/timer.svelte.ts`) hands it, so
	 * the game owns the clock and this card stays a plain, testable box.
	 */
	import { formatSeconds } from '$lib/game/timer.svelte';

	interface Props {
		/** Seconds left for the whole item: this step plus every step to come. */
		totalSecondsLeft: number;
		/** Seconds left in the current step, until the next hint is handed out. */
		secondsUntilHint: number;
		/** Once every step has been given away: "Tijd is om!" replaces the line below. */
		timeUp?: boolean;
	}

	let { totalSecondsLeft, secondsUntilHint, timeUp = false }: Props = $props();

	/**
	 * The last seconds before a hint are called out with weight and motion, not
	 * colour alone, so the pupil notices without relying on colour perception.
	 */
	const urgent = $derived(!timeUp && secondsUntilHint <= 5);
</script>

<div class="rounded-2xl bg-white px-6 py-4 text-center shadow-lg">
	<p class="text-3xl font-bold tabular-nums">{formatSeconds(totalSecondsLeft)}</p>
	{#if timeUp}
		<p class="mt-1 font-medium">Tijd is om!</p>
	{:else}
		<p class="mt-1" class:font-bold={urgent} class:animate-pulse={urgent}>
			{formatSeconds(secondsUntilHint)} tot volgende hint
		</p>
	{/if}
</div>
