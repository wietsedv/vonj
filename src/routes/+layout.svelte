<script lang="ts">
	import '../app.css';

	import favicon from '$lib/assets/favicon.png';
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

<!--
  Every page's content lives in a `<main id="inhoud">`, so this one link gets a
  keyboard user past the header of whichever screen they are on. It is the first
  thing in the tab order and invisible until it has focus.
-->
<a
	href="#inhoud"
	class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg"
>
	Naar de inhoud
</a>

{@render children()}

<style>
	:global(html) {
		background-color: var(--color-secondary);
	}
</style>
