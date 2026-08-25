<script lang="ts">
	import { gameFor } from '$lib/components/games';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Game = $derived(gameFor(data.category, data.section.id));
</script>

{#if Game}
	<Game category={data.category} section={data.section} level={data.level} />
{:else}
	<!--
		Unreachable: every section of the content set has a game, and
		`games.test.ts` holds the registry to the rules table so it stays that way.
		The bare shell is here so that a section added ahead of its game still
		opens, with its header and its way back, rather than on a blank page.
	-->
	<LevelShell category={data.category} section={data.section} />
{/if}
