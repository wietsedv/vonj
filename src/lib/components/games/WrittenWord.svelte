<script lang="ts">
	/**
	 * The correct spelling on the feedback card of both writing games: "Het
	 * juist geschreven woord is:" followed by the word in the same letter boxes
	 * used for playing, in read-only mode. See
	 * docs/original-app/level-shell.md, "Per-item feedback card".
	 */
	import LetterBoxes from '$lib/components/level/LetterBoxes.svelte';
	import { getLanguage } from '$lib/languages';
	import type { Language } from '$lib/types';

	interface Props {
		language: Language;
		/** The correct spelling, one entry per letter. */
		letters: string[];
	}

	let { language, letters }: Props = $props();
</script>

<LetterBoxes {letters} lang={getLanguage(language).lang} readonly onletter={() => {}} />
