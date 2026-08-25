<script lang="ts">
	/**
	 * The correct spelling on the feedback card of both writing games: "Het
	 * juist geschreven woord is:" followed by the word in the same letter boxes
	 * used for playing, in read-only mode. See
	 * docs/original-app/level-shell.md, "Per-item feedback card".
	 */
	import LetterBoxes from '$lib/components/level/LetterBoxes.svelte';

	interface Props {
		/** The correct spelling, one entry per letter. */
		letters: string[];
	}

	let { letters }: Props = $props();
</script>

<LetterBoxes {letters} readonly onletter={() => {}} />
