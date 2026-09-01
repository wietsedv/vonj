<script lang="ts">
	import type { GameProps } from '$lib/components/games';
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import PictureGrid from '$lib/components/level/PictureGrid.svelte';
	import { loadStories } from '$lib/content';
	import { animationUrl, imageUrl } from '$lib/content/assets';
	import { LevelRun } from '$lib/game/level.svelte';
	import { fragmentIndex, fragmentItems, fragmentText, pictureOptions } from '$lib/game/pictures';
	import { gameRules } from '$lib/game/rules';
	import type { Fragment } from '$lib/types';
	import { onMount } from 'svelte';

	let { category, section, level }: GameProps = $props();

	/**
	 * The distractors come from every story, so the whole content set has to be
	 * there before there are items, and `localStorage` only exists in the
	 * browser. So the run is built after mount, and until it is the shell renders
	 * on its own rather than flashing a grid that is about to change.
	 */
	let run = $state<LevelRun | null>(null);
	let fragments = $state(new Map<string, Fragment>());
	let animation = $state<string | null>(null);

	onMount(async () => {
		const stories = await loadStories();
		const story = stories.find((candidate) => candidate.key === level.story);
		const rules = gameRules(category, section.id);
		if (!story || !rules) return;

		fragments = fragmentIndex(stories);
		animation = animationUrl(story.image);
		run = new LevelRun({ level, rules, generate: () => fragmentItems(story, stories) });
	});

	/** The fragment being played, once there is a run and it is not finished. */
	const fragment = $derived(
		run && !run.finished ? fragments.get(run.item?.target[0] ?? '') : undefined
	);

	const options = $derived(
		run && !run.finished && run.item
			? pictureOptions(run.item).map((key) => ({
					key,
					image: imageUrl(fragments.get(key)?.image ?? '')
				}))
			: []
	);

	/** The cards that were tapped and were wrong, so the grid can lock them. */
	const wrong = $derived(
		run?.item?.responses.flat().filter((key) => key !== run?.item.target[0]) ?? []
	);

	/** A card that was already tapped costs nothing: it is not a new attempt. */
	function select(key: string) {
		if (wrong.includes(key)) return;
		run?.respond([key]);
	}
</script>

<!-- The story text card of docs/original-app/level-shell.md, this game's top area. -->
{#snippet sentenceCard()}
	{#if fragment}
		<p lang="gos" class="rounded-2xl bg-white px-6 py-5 text-center text-lg shadow-lg">
			{fragmentText(fragment)}
		</p>
	{/if}
{/snippet}

<LevelShell {category} {section} {run} {animation} top={fragment ? sentenceCard : undefined}>
	{#if run?.answered && fragment}
		<ItemFeedback
			description="Het juiste antwoord was:"
			image={animationUrl(fragment.image)}
			onproceed={() => run?.proceed()}
		/>
	{:else if options.length > 0}
		<PictureGrid {options} {wrong} onselect={select} />
	{/if}
</LevelShell>
