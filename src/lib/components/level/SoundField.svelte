<script module lang="ts">
	/** How a field is coloured once its column has been marked. Never used alone: see the icon below. */
	export type SoundFieldResult = 'correct' | 'wrong' | null;
</script>

<script lang="ts">
	import Check from '$lib/icons/check.svelte';
	import Cross from '$lib/icons/cross.svelte';

	interface Props {
		/** Spelling of the sound to show, or null for an empty, unfilled field. */
		sound: string | null;
		/**
		 * Colours the field green or red, with a check or cross next to it so the
		 * result is never colour alone. Null before a submit, and always on the
		 * feedback card, which only ever shows the correct answer.
		 */
		result?: SoundFieldResult;
		/** Scales the field up while `sound` is the one currently playing. */
		sounding?: boolean;
		/** Accessible label; the field itself only shows the bare spelling. */
		label: string;
		/** Tapping the field: replays `sound`. Disabled while there is nothing to replay. */
		onclick: () => void;
	}

	let { sound, result = null, sounding = false, label, onclick }: Props = $props();

	// One mutually exclusive class per state: mixing a static "neutral" pair
	// with a conditional "correct"/"wrong" pair on the same element left both
	// rules in the stylesheet at equal specificity, and whichever Tailwind
	// happened to emit last silently won, regardless of which was on the
	// element. Keeping exactly one pair present per render avoids that.
	const tone: Record<'neutral' | 'correct' | 'wrong', string> = {
		neutral: 'border-gray-300 bg-white',
		correct: 'border-accent bg-accent/10',
		wrong: 'border-primary bg-primary/10'
	};
</script>

<!--
  Shared by SoundColumns (the display field above each column) and the
  sound-based games' feedback card ("De juiste uitspraak is:"), which shows the
  word's sounds as this same tappable field with no result colouring. See
  docs/original-app/games.md and the "Per-item feedback card" section of
  docs/original-app/level-shell.md.
-->
<button
	type="button"
	disabled={sound === null}
	aria-label={label}
	onclick={() => onclick()}
	class="flex h-12 w-full items-center justify-center gap-1 rounded-lg border-2 text-lg font-semibold
		transition-all duration-150 enabled:hover:brightness-95 enabled:focus:brightness-95
		{tone[result ?? 'neutral']} {sounding ? 'scale-125' : ''}"
>
	{sound ?? ''}
	{#if result === 'correct'}
		<span class="[&>svg]:fill-accent [&>svg]:size-4"><Check /></span>
	{:else if result === 'wrong'}
		<span class="[&>svg]:fill-primary [&>svg]:size-4"><Cross /></span>
	{/if}
</button>
