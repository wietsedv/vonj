<script lang="ts">
	/**
	 * The reordering board shared by `LezenZinnen.svelte` and
	 * `LezenZinnenTijdslimiet.svelte`: the drag-and-drop list plus the
	 * wrong-order message. See `docs/original-app/games.md`, "Lezen > Zinnen"
	 * and the shared "Drag-and-drop list" section.
	 *
	 * The original reported a wrong submit through a native, blocking
	 * `Dialogs.alert("Nog niet alle onderdelen staan op de juiste plaats")`.
	 * That is a deliberate web deviation here (see `docs/rewrite.md`, "Alerts
	 * are inline messages, not dialogs"): `window.alert` cannot be styled,
	 * freezes the page, and cannot be driven from a test, so the same copy is
	 * shown as a plain inline banner above the list instead.
	 *
	 * This component owns none of the state: the order, the locked rows and the
	 * markers are all decided by the caller, exactly like `ReorderList` itself.
	 */
	import ReorderList from '$lib/components/level/ReorderList.svelte';
	import type { RowMarker } from '$lib/components/level/ReorderList.svelte';
	import { rowsFor } from './sentenceRows';

	interface Props {
		/** The current order, top to bottom, as row keys. */
		order: string[];
		/** Row key to Gronings text, from `rowIndex(story)`. */
		index: Map<string, string>;
		/** Keys given as a hint (the free head start, or the timer's hints): locked in place. */
		locked: string[];
		/** Per-key marker from the last submit. Empty means no submit happened yet, or it was right. */
		markers: Record<string, RowMarker>;
		onreorder: (keys: string[]) => void;
		onsubmit: () => void;
	}

	let { order, index, locked, markers, onreorder, onsubmit }: Props = $props();

	/** A submit happened and it was wrong: `markers` is only ever populated in that case. */
	const wrong = $derived(Object.keys(markers).length > 0);
</script>

{#if wrong}
	<p class="bg-primary/10 text-primary mb-3 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
		Nog niet alle onderdelen staan op de juiste plaats
	</p>
{/if}

<ReorderList
	rows={rowsFor(order, index)}
	{locked}
	{markers}
	instruction="Gebruik de streepjes om de items naar de juiste volgorde te verslepen."
	{onreorder}
	{onsubmit}
/>
