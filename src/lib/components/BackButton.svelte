<script lang="ts">
	import { resolve } from '$app/paths';
	import Back from '$lib/icons/back.svelte';
	import type { Category } from '$lib/types';

	interface Props {
		/**
		 * Back always goes up exactly one screen: to the category overview from a
		 * level, and to the global overview from a category.
		 */
		category?: Category | null;
		label: string;
	}

	let { category = null, label }: Props = $props();
</script>

<a
	href={resolve(category ? `/${category}` : '/')}
	aria-label={label}
	class="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full transition hover:bg-white/20 focus:bg-white/20 [&>svg]:fill-white"
>
	<Back />
</a>
