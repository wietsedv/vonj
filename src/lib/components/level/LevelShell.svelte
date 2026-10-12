<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import LevelResult from '$lib/components/level/LevelResult.svelte';
	import ProgressDots from '$lib/components/level/ProgressDots.svelte';
	import type { LevelRun } from '$lib/game/level.svelte';
	import { categoryIcons } from '$lib/icons';
	import type { Category, Language, Section } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props {
		language: Language;
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
		/**
		 * Hides the top area without unmounting it. The listening games hide
		 * their player behind the feedback card, as the original did with a
		 * `v-show`, so a recording that is still playing when the pupil answers
		 * plays on.
		 */
		hideTop?: boolean;
		/** The game itself: the interaction or its feedback card. */
		children?: Snippet;
	}

	let {
		language,
		category,
		section,
		run = null,
		animation = null,
		top,
		hideTop = false,
		children
	}: Props = $props();

	const Icon = $derived(categoryIcons[category]);
	const dots = $derived(run ? run.items.map((item, index) => run.dot(index)) : []);
</script>

<div class="flex min-h-screen flex-col">
	<!--
	  The icon is part of the title's text, so a long name like "Woorden met
	  tijdslimiet" wraps with the icon in front of its first word instead of
	  leaving it stranded beside two lines. On a screen that is short rather than
	  narrow - a phone on its side - the header gives up its padding and its
	  size, or it would take more than half of the height before the game.
	-->
	<header class="bg-primary short:pt-3 short:pb-7 relative px-4 pt-14 pb-10 shadow-lg">
		<BackButton {language} {category} label="Terug naar het overzicht" />

		<div class="mx-auto max-w-md text-center text-balance text-white">
			<h1
				class="xs:text-3xl short:my-0 short:text-2xl my-2 text-2xl font-medium [&_svg]:fill-white"
			>
				<span
					class="short:[&>svg]:size-7 mr-1 inline-block align-[-0.2em] [&>svg]:size-8"
					aria-hidden="true"><Icon /></span
				>{section.name}
			</h1>
			<!-- Both lines here, including the instruction the overview leaves out. -->
			{#each section.description as line, index (index)}
				<p class="short:text-sm">{line}</p>
			{/each}
		</div>
	</header>

	<main id="inhoud" class="short:py-6 mx-auto -mt-4 w-full max-w-xl flex-1 px-4 py-8">
		{#if run?.finished}
			<LevelResult
				score={run.score ?? 0}
				{animation}
				{language}
				{category}
				replayable={run.replayable}
				onreplay={() => run?.restart()}
			/>
		{:else}
			{#if top}
				<div class="mb-6" class:hidden={hideTop}>{@render top()}</div>
			{/if}
			{@render children?.()}
		{/if}
	</main>

	{#if !run?.finished && dots.length > 0}
		<footer><ProgressDots states={dots} /></footer>
	{/if}
</div>
