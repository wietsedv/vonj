<script lang="ts">
	import Score from '$lib/components/Score.svelte';
	import Check from '$lib/icons/check.svelte';
	import Cross from '$lib/icons/cross.svelte';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		/** "Dat klopt!", "Jammer!" or, on the level result, "Goed gedaan!". */
		title?: string;
		/** The check mark or the cross next to the title. */
		tone?: 'correct' | 'wrong' | null;
		/** For example "Het juiste antwoord was:". Differs per game. */
		description?: string | null;
		/** A 0-6 score, shown as three stars. Only the level result has one. */
		score?: number | null;
		/** Illustration to show when the card has no content of its own. */
		image?: string | null;
		/** The correct answer, in whatever shape the game shows it. */
		children?: Snippet;
		/** "Doorgaan", "Terug naar het overzicht", a replay button. */
		actions?: Snippet;
	}

	let {
		title = 'Goed gedaan!',
		tone = null,
		description = null,
		score = null,
		image = null,
		children,
		actions
	}: Props = $props();

	let heading = $state<HTMLHeadingElement | undefined>();

	// This card replaces the whole interaction, so it is a new screen in
	// everything but the URL. Nothing announced it before: focus stayed on a
	// button that had just been removed and dropped to the document. Focusing the
	// heading reads "Dat klopt!" or "Jammer!" out, and leaves "Doorgaan" one Tab
	// away. See the "Accessibility" item in TODO.md.
	onMount(() => heading?.focus());
</script>

<div class="mx-auto max-w-md rounded-2xl bg-white px-6 py-10 text-center shadow-lg">
	<h2 bind:this={heading} tabindex="-1" class="text-3xl font-bold outline-none">
		<span class="inline-flex items-center gap-2">
			{title}
			{#if tone === 'correct'}
				<span class="[&>svg]:fill-accent"><Check /></span>
			{:else if tone === 'wrong'}
				<span class="[&>svg]:fill-primary"><Cross /></span>
			{/if}
		</span>
	</h2>

	{#if description}
		<p class="mt-4">{description}</p>
	{/if}

	{#if children}
		<div class="mt-6">{@render children()}</div>
	{:else if image}
		<img src={image} alt="" class="mx-auto mt-6 w-60 max-w-full rounded-lg" />
	{/if}

	{#if score !== null}
		<div class="mt-6 [&_svg]:size-8">
			<Score {score} />
		</div>
	{/if}

	{#if actions}
		<div class="mt-8 flex flex-col items-stretch gap-2">{@render actions()}</div>
	{/if}
</div>
