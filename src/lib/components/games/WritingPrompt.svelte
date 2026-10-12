<script lang="ts">
	/**
	 * The top-area card both writing games show above the letter boxes: the
	 * Gronings sentence with the missing word blanked out to dots, and its
	 * Dutch translation. See `docs/original-app/games.md`, "Schrijven >
	 * Woorden". The labels are the original's copy, used verbatim: "Grunnegs" or
	 * "Achterhooks" above the sentence, by language.
	 */
	import { getLanguage } from '$lib/languages';
	import type { Language } from '$lib/types';

	interface Props {
		language: Language;
		/** The masked sentence from `maskedPrompt()`, e.g. "Over en deur [......] lopen." */
		prompt: string;
		/** The Dutch translation of the missing word. */
		translation: string;
	}

	let { language, prompt, translation }: Props = $props();

	const info = $derived(getLanguage(language));
</script>

<div class="space-y-4 rounded-2xl bg-white px-6 py-5 shadow-lg">
	<div>
		<p class="text-sm font-medium text-gray-500">{info.label}</p>
		<p lang={info.lang} class="mt-1 text-lg">{prompt}</p>
	</div>
	<div>
		<p class="text-sm font-medium text-gray-500">Nederlands</p>
		<p class="mt-1 text-lg">{translation}</p>
	</div>
</div>
