<script lang="ts">
	import { resolve } from '$app/paths';
	import Score from './Score.svelte';

	const { title, description } = $props();

	const levels = [
		{ id: 1, score: 3 },
		{ id: 2, score: 2 },
		{ id: 3, score: 1 },
		{ id: 4, score: null }
	];
</script>

<div class="px-4">
	<div class="text-2xl font-semibold text-white">{title}</div>
	<div class="text-white">{description}</div>

	<div class="xs:grid-cols-3 2xs:grid-cols-2 my-6 grid gap-3 sm:grid-cols-4">
		{#each levels as level (level.id)}
			<a
				href={resolve('/')}
				class="rounded-lg bg-white px-2 py-6 text-center transition hover:bg-gray-100 hover:shadow-xl"
			>
				<div class="mb-4 text-xl font-medium">Level {level.id}</div>
				<Score score={level.score} />
			</a>
		{/each}
	</div>
</div>
