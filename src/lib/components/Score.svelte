<script lang="ts">
	import Play from '$lib/icons/play.svelte';
	import StarFilled from '$lib/icons/star-filled.svelte';
	import StarHalf from '$lib/icons/star-half.svelte';
	import Star from '$lib/icons/star.svelte';

	interface Props {
		/**
		 * A 0-6 score, null for a scope that is not finished yet, or undefined
		 * while progress is still unknown. A category average is a plain mean, so
		 * this is not always a whole number. See `docs/original-app/scoring.md`.
		 */
		score: number | null | undefined;
	}

	let { score }: Props = $props();

	// Every two points fill one star, so each star is worth 0, 1 or 2 points, and
	// a fractional average lands on the nearest half star.
	const stars = $derived(
		score === null || score === undefined
			? []
			: [0, 1, 2].map((index) => Math.min(2, Math.max(0, score - index * 2)))
	);

	/** How many stars the icons add up to, counting a half star as a half. */
	const filled = $derived(
		stars.reduce((total, star) => total + (star >= 1.5 ? 1 : star >= 0.5 ? 0.5 : 0), 0)
	);

	// Three inline SVGs say nothing on their own, so the row carries the same
	// thing in words. Dutch writes the half with a comma.
	const label = $derived(
		score === null ? 'Nog niet gespeeld' : `${filled.toString().replace('.', ',')} van de 3 sterren`
	);
</script>

<div
	class="[&>svg]:fill-accent flex justify-center gap-1"
	role={score === undefined ? undefined : 'img'}
	aria-label={score === undefined ? undefined : label}
	aria-hidden={score === undefined ? 'true' : undefined}
>
	{#if score === undefined}
		<!-- Hold the space until localStorage has been read, without claiming a score. -->
		<div class="invisible"><Play /></div>
	{:else if score === null}
		<Play />
	{:else}
		{#each stars as star, index (index)}
			{#if star >= 1.5}
				<StarFilled />
			{:else if star >= 0.5}
				<StarHalf />
			{:else}
				<Star />
			{/if}
		{/each}
	{/if}
</div>
