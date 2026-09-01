<script lang="ts">
	import type { DotState } from '$lib/game/level.svelte';

	interface Props {
		/** One state per item of the level, in item order. */
		states: DotState[];
	}

	let { states }: Props = $props();

	// The current dot keeps the colour the original gave it, which is the colour
	// of the page behind it. The original had a footer bar in that same colour;
	// here a white ring stands in for it, so the dot is a dot. See
	// `docs/rewrite.md`.
	const colours: Record<DotState, string> = {
		current: 'bg-secondary text-white ring-2 ring-white',
		correct: 'bg-accent text-white',
		wrong: 'bg-primary text-white',
		neutral: 'bg-gray-300 text-black'
	};

	// Green against red is the only visible difference between a finished item
	// and a wrong one, so every dot also spells its state out for a screen
	// reader. See the "Accessibility" item in TODO.md.
	const spoken: Record<DotState, string> = {
		current: 'nu bezig',
		correct: 'goed',
		wrong: 'fout',
		neutral: 'nog niet gedaan'
	};
</script>

<!-- The dot count tells the pupil up front how long the level is. -->
<ol class="flex flex-wrap justify-center gap-2.5 px-4 py-3" aria-label="Voortgang in dit level">
	{#each states as state, index (index)}
		<li
			class="flex size-6 items-center justify-center rounded-full text-sm {colours[state]}"
			aria-current={state === 'current' ? 'step' : undefined}
		>
			{index + 1}<span class="sr-only">: {spoken[state]}</span>
		</li>
	{/each}
</ol>
