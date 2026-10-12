<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import { getCategory } from '$lib/content';
	import { categoryIcons } from '$lib/icons';
	import { pageTitle } from '$lib/title';
	import type { Category, Language } from '$lib/types';

	interface Props {
		language: Language;
		id: Category;
	}

	let { language, id }: Props = $props();

	const category = $derived(getCategory(language, id));
</script>

<svelte:head>
	<title>{category ? pageTitle(language, category.name) : pageTitle(language)}</title>
</svelte:head>

{#if category}
	<main id="inhoud">
		<CategoryHeader
			{language}
			Icon={categoryIcons[id]}
			title={category.name}
			description={category.description}
		/>

		<div class="mx-auto mt-8 mb-24 max-w-xl">
			{#each category.sections as section (section.id)}
				<SubcategorySection {language} category={id} {section} />
			{/each}
		</div>
	</main>
{/if}
