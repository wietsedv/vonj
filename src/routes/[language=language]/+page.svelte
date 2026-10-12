<script lang="ts">
	import { resolve } from '$app/paths';
	import BackButton from '$lib/components/BackButton.svelte';
	import Score from '$lib/components/Score.svelte';
	import { categories } from '$lib/content';
	import { categoryIcons } from '$lib/icons';
	import { getLanguage } from '$lib/languages';
	import { progress } from '$lib/progress.svelte';

	let { data } = $props();

	const language = $derived(getLanguage(data.language));
	// "Van Old noar Jong: Grunnegs" is set on two lines, broken after the colon.
	const [nameStart, nameEnd] = $derived(language.appName.split(': '));
</script>

<svelte:head>
	<title>{language.appName}</title>
</svelte:head>

<main id="inhoud">
	<div class="bg-primary relative px-4 pt-18 pb-24 shadow-lg">
		<!-- Back to the language picker, which the original, one language per app, did not have. -->
		<BackButton label="Terug naar het overzicht" />

		<div class="mx-auto max-w-md text-center text-white">
			<h1 class="my-4 text-4xl font-medium">{nameStart}:<br />{nameEnd}</h1>
			<p>{language.question}</p>
			<p>Speel alle levels om erachter te komen!</p>
		</div>
	</div>

	<div class="relative mx-auto -mt-20 max-w-md px-4 py-10">
		<div class="flex w-full flex-col items-center gap-3">
			{#each categories(data.language) as category (category.id)}
				{@const scope = progress.category(data.language, category.id)}
				{@const Icon = categoryIcons[category.id]}
				<a
					href={resolve(`/${data.language}/${category.id}`)}
					class="flex w-full items-center gap-4 rounded-lg bg-white px-4 py-3 transition hover:bg-gray-100 hover:shadow-xl focus:bg-gray-100 focus:shadow-xl"
				>
					<div class="[&>svg]:fill-primary w-10 text-center [&>svg]:inline-block">
						<Icon />
					</div>

					<div class="flex-1">
						<h2 class="text-xl font-medium">{category.name}</h2>
						<!-- Empty until localStorage has been read, rather than claiming zero. -->
						<p class="min-h-5 text-sm">
							{#if progress.loaded}
								{#if scope.completed < scope.levels}{scope.completed} van de {scope.levels}
									levels gespeeld
								{:else}Alle levels gespeeld!
								{/if}
							{/if}
						</p>
					</div>

					<Score score={progress.loaded ? scope.score : undefined} />
				</a>
			{/each}
		</div>
	</div>
</main>
