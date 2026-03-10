<script lang="ts">
	import { resolve } from '$app/paths';
	import Score from '$lib/components/Score.svelte';
	import Listen from '$lib/icons/listen.svelte';
	import Read from '$lib/icons/read.svelte';
	import Speak from '$lib/icons/speak.svelte';
	import Write from '$lib/icons/write.svelte';
	import type { Category } from '$lib/types';
	import type { Component } from 'svelte';

	interface CategoryState {
		id: Category;
		name: string;
		icon: Component;
		levels: number;
		completedLevels: number;
		score: number | null;
	}

	const categories: CategoryState[] = [
		{
			id: 'luisteren',
			name: 'Luisteren',
			icon: Listen,
			levels: 12,
			completedLevels: 12,
			score: 2
		},
		{
			id: 'lezen',
			name: 'Lezen',
			icon: Read,
			levels: 12,
			completedLevels: 0,
			score: null
		},
		{
			id: 'schrijven',
			name: 'Schrijven',
			icon: Write,
			levels: 8,
			completedLevels: 0,
			score: null
		},
		{
			id: 'spreken',
			name: 'Spreken',
			icon: Speak,
			levels: 12,
			completedLevels: 0,
			score: null
		}
	];
</script>

<div class="bg-primary px-4 pt-18 pb-24 shadow-lg">
	<div class="mx-auto max-w-md text-center text-white">
		<h1 class="my-4 text-4xl font-medium">Van Old noar Jong:<br />Grunnegs</h1>
		<p>Hoe goed is jouw Gronings?</p>
		<p>Speel alle levels om erachter te komen!</p>
	</div>
</div>

<div class="mx-auto -mt-20 max-w-md px-4 py-10">
	<div class="flex w-full flex-col items-center gap-3">
		{#each categories as category (category.id)}
			<a
				href={resolve(`/${category.id}`)}
				class="flex w-full items-center gap-4 rounded-lg bg-white px-4 py-3 transition hover:bg-gray-100 hover:shadow-xl focus:bg-gray-100 focus:shadow-xl"
			>
				<div class="[&>svg]:fill-primary w-10 text-center [&>svg]:inline-block">
					<category.icon />
				</div>

				<div class="flex-1">
					<h2 class="text-xl font-medium">{category.name}</h2>
					<p class="text-sm">
						{#if category.completedLevels < category.levels}{category.completedLevels} van de {category.levels}
							levels gespeeld
						{:else}Alle levels gespeeld!
						{/if}
					</p>
				</div>

				<Score score={category.score} />
			</a>
		{/each}
	</div>
</div>
