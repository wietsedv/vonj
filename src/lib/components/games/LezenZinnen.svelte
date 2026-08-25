<script lang="ts">
	/**
	 * Lezen > Zinnen: the pupil drags scrambled chunks of story text back into
	 * the right order. See `docs/original-app/games.md`, "Lezen > Zinnen", and
	 * the shared "Items", "Adaptive difficulty" and "Drag-and-drop list"
	 * sections. `LezenZinnenTijdslimiet.svelte` plays the same items with a
	 * clock instead of the free head start; the two share `SentenceBoard`,
	 * `SentenceResultCard` and `SentenceFeedback`.
	 */
	import type { GameProps } from '$lib/components/games';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import type { RowMarker } from '$lib/components/level/ReorderList.svelte';
	import { loadStory } from '$lib/content';
	import { LevelRun } from '$lib/game/level.svelte';
	import { gameRules } from '$lib/game/rules';
	import {
		freeHeadStart,
		rowIndex,
		rowMarkers,
		sentenceItems,
		startingRows
	} from '$lib/game/sentences';
	import { onMount } from 'svelte';
	import SentenceBoard from './SentenceBoard.svelte';
	import SentenceFeedback from './SentenceFeedback.svelte';
	import SentenceResultCard from './SentenceResultCard.svelte';

	let { category, section, level }: GameProps = $props();

	/**
	 * This level's own story is enough (no distractors are drawn from the
	 * other stories), but `localStorage` only exists in the browser, so the run
	 * is still built after mount, as `LezenVerhaaltjes` does.
	 */
	let run = $state<LevelRun | null>(null);
	/** Row key to Gronings text, computed from the story once it is loaded. */
	let index = $state(new Map<string, string>());

	onMount(async () => {
		const story = await loadStory(level.story);
		const rules = gameRules(category, section.id);
		if (!rules) return;

		index = rowIndex(story);
		run = new LevelRun({ level, rules, generate: () => sentenceItems(story) });
	});

	/** The current row order, top to bottom. Not persisted: it is recomputed from `startingRows` on resume. */
	let order = $state<string[]>([]);
	/** Markers from the last wrong submit; cleared as soon as the pupil reorders. */
	let markers = $state<Record<string, RowMarker>>({});

	/**
	 * The free head start: `max(0, 1 - difficulty)` rows of the correct order,
	 * given and locked. Two chunks at difficulty -1, one at 0, none at 1.
	 */
	const given = $derived(run?.item ? freeHeadStart(run.difficulty) : 0);
	const locked = $derived(run?.item ? run.item.target.slice(0, given) : []);

	/** A fresh item: reset the order to its starting shuffle (given rows pinned to the top) and clear markers. */
	$effect(() => {
		if (!run?.item) return;
		order = startingRows(run.item, given);
		markers = {};
	});

	function reorder(keys: string[]) {
		order = keys;
		// Reordering after a wrong submit starts a fresh attempt.
		markers = {};
	}

	function submit() {
		if (!run?.item) return;
		run.respond(order);
		markers = run.answered ? {} : rowMarkers(run.item, order);
	}
</script>

<!-- The "Resultaat" card of docs/original-app/games.md, this game's top area. -->
{#snippet resultCard()}
	<SentenceResultCard {order} {index} />
{/snippet}

<LevelShell {category} {section} {run} top={run?.item && !run.answered ? resultCard : undefined}>
	{#if run?.item && run.answered}
		<SentenceFeedback item={run.item} {index} onproceed={() => run?.proceed()} />
	{:else if run?.item}
		<SentenceBoard {order} {index} {locked} {markers} onreorder={reorder} onsubmit={submit} />
	{/if}
</LevelShell>
