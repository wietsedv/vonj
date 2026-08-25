<script lang="ts">
	/**
	 * The "Resultaat" card of `docs/original-app/games.md`, "Lezen > Zinnen":
	 * the current row order read back as one line, so the pupil can tell
	 * whether the story reads correctly before submitting. Shared by
	 * `LezenZinnen.svelte` and `LezenZinnenTijdslimiet.svelte`.
	 */
	import { resultText } from './sentenceRows';

	interface Props {
		/** The current order, top to bottom, as row keys. */
		order: string[];
		/** Row key to Gronings text, from `rowIndex(story)`. */
		index: Map<string, string>;
	}

	let { order, index }: Props = $props();
</script>

<div class="rounded-2xl bg-white px-6 py-5 shadow-lg">
	<p class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Resultaat</p>
	<p class="mt-2 text-lg">{resultText(order, index)}</p>
</div>
