<script lang="ts">
	import { getLanguage } from '$lib/languages';

	let { data, children } = $props();

	const icon = $derived(getLanguage(data.language).icon);
</script>

<svelte:head>
	<link rel="icon" href={icon} />
	<link rel="apple-touch-icon" href={icon} />
</svelte:head>

<!--
  The palette of the language: `data-palette` swaps the theme colours for
  everything inside, and `data-page` gives the page background, which sits on
  `<html>`, the same colours. Both are in `src/app.css`.
-->
<div data-palette={data.language} data-page class="contents">
	{@render children()}
</div>
