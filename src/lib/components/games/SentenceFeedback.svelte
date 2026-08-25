<script lang="ts">
	/**
	 * The feedback card shared by `LezenZinnen.svelte` and
	 * `LezenZinnenTijdslimiet.svelte`: "Het juiste verhaaltje was:" followed by
	 * the sentences in the right order. See `docs/original-app/games.md`,
	 * "Lezen > Zinnen".
	 *
	 * The timed variant is the only one that ever passes `title`/`tone`: per
	 * "The three timed sections do not agree on what an expiry costs", it shows
	 * "Jammer!" instead of "Dat klopt!" when the clock gave every row away.
	 */
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import { targetText } from '$lib/game/sentences';
	import type { StoredItem } from '$lib/types';

	interface Props {
		item: StoredItem;
		/** Row key to Gronings text, from `rowIndex(story)`. */
		index: Map<string, string>;
		title?: string;
		tone?: 'correct' | 'wrong';
		onproceed: () => void;
	}

	let { item, index, title = 'Dat klopt!', tone = 'correct', onproceed }: Props = $props();
</script>

<ItemFeedback {title} {tone} description="Het juiste verhaaltje was:" {onproceed}>
	{#each targetText(item, index) as line, position (position)}
		<p>{line}</p>
	{/each}
</ItemFeedback>
