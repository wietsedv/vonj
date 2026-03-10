<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import Read from '$lib/icons/read.svelte';
</script>

<CategoryHeader
	Icon={Read}
	title="Lezen"
	description="Speel deze levels om erachter te komen hoe goed jij Gronings kan lezen!"
/>

<div class="mx-auto mt-8 mb-24 max-w-xl">
	<SubcategorySection title="Verhaaltjes" description="Welk plaatje hoort bij het verhaaltje?" />
	<SubcategorySection
		title="Zinnen"
		description="Sleep de zinnen in de juiste volgorde om het verhaaltje leesbaar te maken"
	/>
	<SubcategorySection
		title="Zinnen met tijdslimiet"
		description="Sleep de zinnen in de juiste volgorde om het verhaaltje leesbaar te maken"
	/>
</div>
