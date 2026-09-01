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

<!--
  The whole card is tabular so a ticking clock keeps every digit in the same
  column: without it the proportional digits change width each second and the
  numbers, and the words after them, jitter.
-->
<div class="rounded-2xl bg-white px-6 py-4 text-center tabular-nums shadow-lg">
	<p class="text-3xl font-bold">{formatSeconds(totalSecondsLeft)}</p>
	{#if timeUp}
		<!-- Inserted the moment the clock runs out, so it is announced once. -->
		<p class="mt-1 font-medium" role="status">Tijd is om!</p>
	{:else}
		<p class="mt-1 {urgent ? 'font-bold motion-safe:animate-pulse' : ''}">
			{formatSeconds(secondsUntilHint)} tot volgende hint
		</p>
		<!--
		  Reading every tick out would be unusable, so only the moment the last
		  seconds start is spoken. The text does not change again inside the
		  window, so a screen reader says it once.
		-->
		<p class="sr-only" role="status">{urgent ? 'Nog vijf seconden tot de hint.' : ''}</p>
	{/if}
</div>
