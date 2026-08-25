<script lang="ts">
	import { resolve } from '$app/paths';
	import FeedbackCard from '$lib/components/level/FeedbackCard.svelte';
	import type { Category } from '$lib/types';

	interface Props {
		/** The 0-6 score of the level, shown as three stars. */
		score: number;
		/** The animated illustration of the story the level was played on. */
		animation?: string | null;
		/** The category "Terug naar het overzicht" goes back to. */
		category: Category;
		/**
		 * Whether to offer a replay. Only for a level that was already finished
		 * when it was opened, so it never appears on a level just played.
		 */
		replayable?: boolean;
		onreplay?: () => void;
	}

	let { score, animation = null, category, replayable = false, onreplay }: Props = $props();
</script>

<FeedbackCard title="Goed gedaan!" {score} image={animation}>
	{#snippet actions()}
		<a
			href={resolve(`/${category}`)}
			class="bg-accent rounded-lg px-6 py-4 text-white transition hover:brightness-95 focus:brightness-95"
		>
			Terug naar het overzicht
		</a>
		{#if replayable}
			<button
				type="button"
				onclick={onreplay}
				class="rounded-lg px-6 py-4 text-gray-700 transition hover:bg-gray-100 focus:bg-gray-100"
			>
				Dit level nog een keer spelen
			</button>
		{/if}
	{/snippet}
</FeedbackCard>
