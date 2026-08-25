<script lang="ts">
	/**
	 * Luisteren > Verhaaltjes: the pupil hears Gronings and picks the
	 * illustration that matches. Audio only, no text anywhere on the screen.
	 * See `docs/original-app/games.md`, "Luisteren > Verhaaltjes", and the
	 * shared "Items", "Adaptive difficulty", "Audio player" and "Drag-and-drop
	 * list" sections.
	 *
	 * Three item kinds share one item list, `pictureItems()`: the whole story
	 * first, then one item per qualifying fragment (played on a picture grid,
	 * exactly as `LezenVerhaaltjes.svelte` plays fragments on text instead of
	 * audio), and the recap last (a `ReorderList` of every fragment
	 * illustration, dragged into story order). Which kind the current item is
	 * follows purely from its position - first, last, or in between, since
	 * `pictureItems()` always returns them in that order - so it survives a
	 * replay's fresh `generate()` call without having to keep the original
	 * `PictureItem` list (with its `kind` tags) around.
	 *
	 * What plays on the recap item is not documented; `../vonj-app/app/pages/
	 * LevelListenStory.vue` renders one `Player` for every item kind, bound to
	 * `audioSrc` (always the story's own recording, `targetData.src_wav`) and
	 * `item.target.time`. The recap's target is a `FragmentList`, which has no
	 * `time` field, so its range comes out `undefined` and the whole story
	 * recording plays unranged - the same as the whole-story item. Its correct
	 * feedback also carries an illustration even though it has no "Het juiste
	 * antwoord was:" line: `imageSrc="item.target.src_gif"` is set for every
	 * kind, and `FragmentList.src_gif` is `targetData.src_gif`, the story's own
	 * animated illustration, not a fragment's. Per `CLAUDE.md`, the app is the
	 * source of truth here; report this to have it added to the docs.
	 */
	import type { GameProps } from '$lib/components/games';
	import AudioPlayer from '$lib/components/level/AudioPlayer.svelte';
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import PictureGrid from '$lib/components/level/PictureGrid.svelte';
	import ReorderList from '$lib/components/level/ReorderList.svelte';
	import type { RowMarker } from '$lib/components/level/ReorderList.svelte';
	import { loadStories } from '$lib/content';
	import { animationUrl, imageUrl, storyUrl } from '$lib/content/assets';
	import { LevelRun } from '$lib/game/level.svelte';
	import {
		fragmentIndex,
		pictureItems,
		pictureOptions,
		RECAP_GIVEN,
		storyIndex
	} from '$lib/game/pictures';
	import { gameRules } from '$lib/game/rules';
	import { rowMarkers, startingRows } from '$lib/game/sentences';
	import type { Fragment, Story } from '$lib/types';
	import { onMount } from 'svelte';

	let { category, section, level }: GameProps = $props();

	type ItemKind = 'story' | 'fragment' | 'recap';

	/**
	 * Which kind the item at `index` (of `count`) is. `pictureItems()` always
	 * builds `[story, ...fragments, recap]`, so position alone decides it -
	 * see the module doc comment for why this is preferred over tagging each
	 * `StoredItem` at generation time.
	 */
	function kindOf(index: number, count: number): ItemKind {
		if (index === 0) return 'story';
		if (index === count - 1) return 'recap';
		return 'fragment';
	}

	/**
	 * The distractors come from every story, so the whole content set has to be
	 * there before there are items, and `localStorage` only exists in the
	 * browser. So the run is built after mount, exactly as `LezenVerhaaltjes`
	 * does.
	 */
	let run = $state<LevelRun | null>(null);
	let story = $state<Story | null>(null);
	let fragments = $state(new Map<string, Fragment>());
	let stories = $state(new Map<string, Story>());
	let animation = $state<string | null>(null);

	onMount(async () => {
		const allStories = await loadStories();
		const found = allStories.find((candidate) => candidate.key === level.story);
		const rules = gameRules(category, section.id);
		if (!found || !rules) return;

		story = found;
		fragments = fragmentIndex(allStories);
		stories = storyIndex(allStories);
		animation = animationUrl(found.image);
		run = new LevelRun({
			level,
			rules,
			generate: () => pictureItems(found, allStories).map((entry) => entry.item)
		});
	});

	const kind = $derived(
		run && !run.finished && run.item ? kindOf(run.index, run.items.length) : null
	);
	const isPicture = $derived(kind === 'story' || kind === 'fragment');
	const isRecap = $derived(kind === 'recap');

	/* ------------------------------------------------------------------ */
	/* Audio: the whole story recording throughout, ranged to the current   */
	/* fragment for a fragment item and unranged for the whole-story and    */
	/* recap items (see the module doc comment above).                      */
	/* ------------------------------------------------------------------ */

	const audioSrc = $derived(story ? storyUrl(story) : null);
	const audioRange = $derived(
		kind === 'fragment' && run?.item ? fragments.get(run.item.target[0])?.time : undefined
	);

	/* ------------------------------------------------------------------ */
	/* The picture grid, for the whole-story and fragment items.            */
	/* ------------------------------------------------------------------ */

	/** The illustration name for `key`, resolved through the right index for the current kind. */
	function imageFor(key: string): string | undefined {
		return kind === 'story' ? stories.get(key)?.image : fragments.get(key)?.image;
	}

	const options = $derived(
		run?.item && isPicture
			? pictureOptions(run.item).map((key) => ({ key, image: imageUrl(imageFor(key) ?? '') }))
			: []
	);

	/** The cards that were tapped and were wrong, so the grid can lock them. */
	const wrong = $derived(
		isPicture && run?.item
			? run.item.responses.flat().filter((key) => key !== run?.item.target[0])
			: []
	);

	/** The animated illustration for a right answer, for the whole-story and fragment items. */
	const answerImage = $derived(
		isPicture && run?.item ? (imageFor(run.item.target[0]) ?? null) : null
	);
	const answerAnimation = $derived(answerImage ? animationUrl(answerImage) : null);

	/** A card that was already tapped costs nothing: it is not a new attempt. */
	function select(key: string) {
		if (wrong.includes(key)) return;
		run?.respond([key]);
	}

	/* ------------------------------------------------------------------ */
	/* The recap: every fragment illustration, dragged into story order.    */
	/* ------------------------------------------------------------------ */

	/** The current row order, top to bottom. Not persisted: recomputed from `startingRows` on resume. */
	let order = $state<string[]>([]);
	/** Markers from the last wrong submit; cleared as soon as the pupil reorders. */
	let markers = $state<Record<string, RowMarker>>({});

	/** The recap's first tile only, given and locked, at every difficulty. See `RECAP_GIVEN`. */
	const locked = $derived(isRecap && run?.item ? run.item.target.slice(0, RECAP_GIVEN) : []);

	/** A fresh recap item: reset the order to its starting shuffle and clear markers. */
	$effect(() => {
		if (!run?.item || !isRecap) return;
		order = startingRows(run.item, RECAP_GIVEN);
		markers = {};
	});

	const recapRows = $derived(
		order.map((key) => ({ key, image: imageUrl(fragments.get(key)?.image ?? '') }))
	);

	/** A submit happened and it was wrong: `markers` is only ever populated in that case. */
	const recapWrong = $derived(Object.keys(markers).length > 0);

	function reorderRecap(keys: string[]) {
		order = keys;
		// Reordering after a wrong submit starts a fresh attempt.
		markers = {};
	}

	function submitRecap() {
		if (!run?.item) return;
		run.respond(order);
		markers = run.answered ? {} : rowMarkers(run.item, order);
	}
</script>

<!-- The audio player of docs/original-app/level-shell.md, this game's top area. -->
{#snippet audioTop()}
	{#if audioSrc}
		<AudioPlayer src={audioSrc} range={audioRange} autoplay={true} />
	{/if}
{/snippet}

<LevelShell {category} {section} {run} {animation} top={run?.item ? audioTop : undefined}>
	{#if run?.answered && isRecap}
		<!-- No "Het juiste antwoord was:" line for the recap; see the module doc comment. -->
		<ItemFeedback image={animation} onproceed={() => run?.proceed()} />
	{:else if run?.answered && isPicture}
		<ItemFeedback
			description="Het juiste antwoord was:"
			image={answerAnimation}
			onproceed={() => run?.proceed()}
		/>
	{:else if isRecap}
		{#if recapWrong}
			<p
				class="bg-primary/10 text-primary mb-3 rounded-xl px-4 py-3 text-sm font-medium"
				role="alert"
			>
				Nog niet alle plaatjes staan op de juiste plaats
			</p>
		{/if}
		<ReorderList
			rows={recapRows}
			{locked}
			{markers}
			instruction="Gebruik de streepjes om de items naar de juiste volgorde te verslepen."
			onreorder={reorderRecap}
			onsubmit={submitRecap}
		/>
	{:else if options.length > 0}
		<PictureGrid {options} {wrong} onselect={select} />
	{/if}
</LevelShell>
