<script lang="ts">
	import { resolve } from '$app/paths';
	import { sectionLevels } from '$lib/content';
	import { progress } from '$lib/progress.svelte';
	import type { Category, Section } from '$lib/types';
	import Score from './Score.svelte';

	interface Props {
		category: Category;
		section: Section;
	}

	let { category, section }: Props = $props();

	const levels = $derived(sectionLevels(category, section.id));
</script>

<div class="px-4">
	<div class="text-2xl font-semibold text-white">{section.name}</div>
	<!-- Only the first line here; the level itself shows the instruction detail. -->
	<div class="text-white">{section.description[0]}</div>

	<div class="xs:grid-cols-3 2xs:grid-cols-2 my-6 grid gap-3 sm:grid-cols-4">
		{#each levels as level (level.id)}
			<a
				href={resolve('/[category=category]/[section]/[level]', {
					category,
					section: section.id,
					level: String(level.number)
				})}
				class="rounded-lg bg-white px-2 py-6 text-center transition hover:bg-gray-100 hover:shadow-xl focus:bg-gray-100 focus:shadow-xl"
			>
				<div class="mb-4 text-xl font-medium">Level {level.number}</div>
				<Score score={progress.loaded ? progress.score(level.id) : undefined} />
			</a>
		{/each}
	</div>
</div>
