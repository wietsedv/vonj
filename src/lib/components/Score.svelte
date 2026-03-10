<script lang="ts">
	import Play from '$lib/icons/play.svelte';
	import StarFilled from '$lib/icons/star-filled.svelte';
	import Star from '$lib/icons/star.svelte';

	const { score } = $props();
</script>

<div class="[&>svg]:fill-accent flex justify-center gap-1">
	{#if score === null}
		<Play />
	{:else}
		{#if score > 0}<StarFilled />{:else}<Star />{/if}
		{#if score > 1}<StarFilled />{:else}<Star />{/if}
		{#if score > 2}<StarFilled />{:else}<Star />{/if}
	{/if}
</div>
