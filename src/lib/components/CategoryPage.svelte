<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import { getCategory } from '$lib/content';
	import { categoryIcons } from '$lib/icons';
	import { APP_NAME, pageTitle } from '$lib/title';
	import type { Category } from '$lib/types';

	interface Props {
		id: Category;
	}

	let { id }: Props = $props();

	const category = $derived(getCategory(id));
</script>

<svelte:head>
	<title>{category ? pageTitle(category.name) : APP_NAME}</title>
</svelte:head>

{#if category}
	<main id="inhoud">
		<CategoryHeader
			Icon={categoryIcons[id]}
			title={category.name}
			description={category.description}
		/>

		<div class="mx-auto mt-8 mb-24 max-w-xl">
			{#each category.sections as section (section.id)}
				<SubcategorySection category={id} {section} />
			{/each}
		</div>
	</main>
{/if}
