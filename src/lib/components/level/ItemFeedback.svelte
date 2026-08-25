<script lang="ts">
	import FeedbackCard from '$lib/components/level/FeedbackCard.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** "Dat klopt!", or "Jammer!" when the clock gave the answer away. */
		title?: string;
		tone?: 'correct' | 'wrong';
		/** For example "Het juiste antwoord was:". Differs per game. */
		description?: string | null;
		/** The correct answer as an illustration, when the game has no content of its own. */
		image?: string | null;
		/** The correct answer, in whatever shape the game shows it. */
		children?: Snippet;
		onproceed: () => void;
	}

	let {
		title = 'Dat klopt!',
		tone = 'correct',
		description = null,
		image = null,
		children,
		onproceed
	}: Props = $props();
</script>

<!-- The per-item card of docs/original-app/level-shell.md: the answer, then "Doorgaan". -->
<FeedbackCard {title} {tone} {description} {image} {children}>
	{#snippet actions()}
		<button
			type="button"
			onclick={onproceed}
			class="bg-accent rounded-lg px-6 py-4 text-white transition hover:brightness-95 focus:brightness-95"
		>
			Doorgaan
		</button>
	{/snippet}
</FeedbackCard>
