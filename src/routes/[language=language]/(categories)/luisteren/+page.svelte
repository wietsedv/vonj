<script lang="ts">
	import CategoryPage from '$lib/components/CategoryPage.svelte';

	let { data } = $props();
</script>

<CategoryPage language={data.language} id="luisteren" />
