<script lang="ts">
	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';
	import { progress } from '$lib/progress.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// localStorage does not exist until the app runs in the browser, so the
	// server-rendered markup is the one without progress and this fills it in.
	onMount(() => progress.load());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(html) {
		background-color: var(--color-secondary);
	}
</style>
