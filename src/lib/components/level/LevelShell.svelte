<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import LevelResult from '$lib/components/level/LevelResult.svelte';
	import ProgressDots from '$lib/components/level/ProgressDots.svelte';
	import type { LevelRun } from '$lib/game/level.svelte';
	import { categoryIcons } from '$lib/icons';
	import type { Category, Section } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props {
		category: Category;
		section: Section;
		/**
		 * The run being played, or null while there is none: before
		 * `localStorage` has been read, and for a section whose game does not
		 * exist yet.
		 */
		run?: LevelRun | null;
		/** The animated illustration of the story, for the level result. */
		animation?: string | null;
		/** Audio player, timer, story text or Dutch prompt. Hidden once finished. */
		top?: Snippet;
		/** The game itself: the interaction or its feedback card. */
		children?: Snippet;
	}

	let { category, section, run = null, animation = null, top, children }: Props = $props();

	const Icon = $derived(categoryIcons[category]);
	const dots = $derived(run ? run.items.map((item, index) => run.dot(index)) : []);
</script>

<div class="flex min-h-screen flex-col">
	<header class="bg-primary relative px-4 pt-14 pb-10 shadow-lg">
		<BackButton {category} label="Terug naar het overzicht" />

		<div class="mx-auto max-w-md text-center text-white">
			<div class="flex items-center justify-center gap-2 [&>svg]:fill-white">
				<Icon />
				<h1 class="my-2 text-3xl font-medium">{section.name}</h1>
			</div>
			<!-- Both lines here, including the instruction the overview leaves out. -->
			{#each section.description as line, index (index)}
				<p>{line}</p>
			{/each}
		</div>
	</header>

	<main class="mx-auto -mt-4 w-full max-w-xl flex-1 px-4 py-8">
		{#if run?.finished}
			<LevelResult
				score={run.score ?? 0}
				{animation}
				{category}
				replayable={run.replayable}
				onreplay={() => run?.restart()}
			/>
		{:else}
			{#if top}
				<div class="mb-6">{@render top()}</div>
			{/if}
			{@render children?.()}
		{/if}
	</main>

	{#if !run?.finished && dots.length > 0}
		<footer><ProgressDots states={dots} /></footer>
	{/if}
</div>
