<script lang="ts">
	import CategoryHeader from '$lib/components/CategoryHeader.svelte';
	import SubcategorySection from '$lib/components/SubcategorySection.svelte';
	import Listen from '$lib/icons/listen.svelte';
</script>

<CategoryHeader
	Icon={Listen}
	title="Luisteren"
	description="Speel deze levels om erachter te komen hoe goed jij Gronings verstaat!"
/>

<div class="mx-auto mt-8 mb-24 max-w-xl">
	<SubcategorySection
		title="Verhaaltjes"
		description="Welk plaatje hoort bij het voorgelezen verhaal?"
	/>
	<SubcategorySection title="Woorden" description="Hoe klinken deze woorden?" />
	<SubcategorySection
		title="Woorden met tijdslimiet"
		description="Hoe snel kun je deze woorden herkennen?"
	/>
</div>
