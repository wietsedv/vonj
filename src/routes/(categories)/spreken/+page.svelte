<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import Speak from '$lib/icons/speak.svelte';
</script>

<CategoryHeader
	Icon={Speak}
	title="Spreken"
	description="Speel deze levels om erachter te komen hoe goed jij Gronings kan spreken!"
/>

<div class="mx-auto mt-8 mb-24 max-w-xl">
	<SubcategorySection
		title="Korte woorden"
		description="Hoe spreek je deze woorden uit in het Gronings?"
	/>
	<SubcategorySection
		title="Normale woorden"
		description="Hoe spreek je deze woorden uit in het Gronings?"
	/>
	<SubcategorySection
		title="Lange woorden"
		description="Hoe spreek je deze woorden uit in het Gronings?"
	/>
</div>
