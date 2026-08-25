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
	<LevelShell category={data.category} section={data.section}>
		<!--
			The remaining games are Phase 2 in TODO.md. Until the game of a section
			exists, a level opens on the shell and says so, the way the original did
			when a section had no implementation.
		-->
		<p class="rounded-2xl bg-white px-6 py-10 text-center">
			Onderdeel '{data.section.name}' is nog niet geïmplementeerd
		</p>
	</LevelShell>
{/if}
