<script lang="ts">
	import { resolve } from '$app/paths';
	import Back from '$lib/icons/back.svelte';
	import type { Category, Language } from '$lib/types';

	interface Props {
		/**
		 * Back always goes up exactly one screen: to the category overview from a
		 * level, to the global overview of the language from a category, and to
		 * the language picker from the global overview.
		 */
		language?: Language | null;
		category?: Category | null;
		label: string;
	}

	let { language = null, category = null, label }: Props = $props();

	/** The screen one level up from where the button is. */
	const up = $derived(
		language && category
			? (`/${language}/${category}` as const)
			: language
				? (`/${language}` as const)
				: ('/' as const)
	);
</script>

<a
	href={resolve(up)}
	aria-label={label}
	class="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full transition hover:bg-white/20 focus:bg-white/20 [&>svg]:fill-white"
>
	<Back />
</a>
