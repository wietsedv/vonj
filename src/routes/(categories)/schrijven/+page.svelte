<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import Write from '$lib/icons/write.svelte';
</script>

<CategoryHeader
	Icon={Write}
	title="Schrijven"
	description="Speel deze levels om erachter te komen hoe goed jij Gronings kan schrijven!"
/>

<div class="mx-auto mt-8 mb-24 max-w-xl">
	<SubcategorySection
		title="Woorden"
		description="Hoe schrijf je het missende woord in het Gronings?"
	/>
	<SubcategorySection
		title="Woorden met tijdslimiet"
		description="Hoe schrijf je het missende woord in het Gronings?"
	/>
</div>
