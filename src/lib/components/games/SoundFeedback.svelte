<script lang="ts">
	/**
	 * The feedback card shared by all five sound-column sections: "De juiste
	 * uitspraak is:" followed by the word's sounds as tappable `SoundField`s.
	 * See `docs/original-app/games.md`, "Luisteren > Woorden" and "Spreken >
	 * Korte, Normale en Lange woorden", and the "Per-item feedback card"
	 * section of `docs/original-app/level-shell.md`.
	 *
	 * `sounding` is threaded through so the app's own-answer playback can scale
	 * the same field it would have scaled in the columns, now that the body has
	 * switched to this card - see `LuisterenWoorden.svelte` for why that switch
	 * already happened by the time playback starts.
	 *
	 * Only `LuisterenWoorden.svelte` and its timed variant ever pass
	 * `translation`, for the "Nederlands: <translation>" line; the three
	 * Spreken sections have no Dutch translation to add because the pupil was
	 * already given the Dutch word as the prompt. Only the timed variant ever
	 * passes `title`/`tone`: per "The three timed sections do not agree on
	 * what an expiry costs", it shows "Jammer!" instead of "Dat klopt!" once
	 * the clock has given the whole word away.
	 */
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import SoundField from '$lib/components/level/SoundField.svelte';

	interface Props {
		/** The word's sounds, left to right. */
		sounds: string[];
		title?: string;
		tone?: 'correct' | 'wrong';
		/** Index of the sound currently sounding in the answer playback, or null. */
		sounding?: number | null;
		/** "Nederlands: <translation>", for the Luisteren > Woorden sections only. */
		translation?: string | null;
		/** Tapping a sound field: replay that sound. */
		onreplay: (sound: string) => void;
		onproceed: () => void;
	}

	let {
		sounds,
		title = 'Dat klopt!',
		tone = 'correct',
		sounding = null,
		translation = null,
		onreplay,
		onproceed
	}: Props = $props();
</script>

<ItemFeedback {title} {tone} description="De juiste uitspraak is:" {onproceed}>
	<div class="flex flex-col items-center gap-3">
		<ol class="flex gap-2">
			{#each sounds as sound, index (index)}
				<li class="w-14">
					<SoundField
						{sound}
						sounding={sounding === index}
						label={`Klank "${sound}" afspelen`}
						onclick={() => onreplay(sound)}
					/>
				</li>
			{/each}
		</ol>
		{#if translation}
			<p>Nederlands: {translation}</p>
		{/if}
	</div>
</ItemFeedback>
