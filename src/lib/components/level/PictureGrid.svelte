<script module lang="ts">
	/** One card of the grid. */
	export interface PictureOption {
		/** The key the answer is recorded as. */
		key: string;
		/** URL of the still illustration on the card. */
		image: string;
	}
</script>

<script lang="ts">
	interface Props {
		/** 4 to 6 options, in the order they are shown. */
		options: PictureOption[];
		/**
		 * The keys that were tapped and were wrong. Those cards carry the
		 * "Helaas!" overlay and cannot be tapped again.
		 */
		wrong?: string[];
		onselect: (key: string) => void;
	}

	let { options, wrong = [], onselect }: Props = $props();
</script>

<!-- Two columns, so four options are two rows and six are three, as in the original. -->
<ul class="grid grid-cols-2 gap-3">
	{#each options as option (option.key)}
		{@const locked = wrong.includes(option.key)}
		<li>
			<button
				type="button"
				disabled={locked}
				onclick={() => onselect(option.key)}
				class="relative block w-full overflow-hidden rounded-2xl bg-white shadow-lg transition
					enabled:hover:brightness-95 enabled:focus:brightness-95"
			>
				<img src={option.image} alt="" class="aspect-square w-full object-cover" />
				{#if locked}
					<!-- Translucent, so the picture that was picked stays visible underneath. -->
					<span
						class="bg-primary/50 absolute inset-0 flex items-center justify-center text-xl text-white"
					>
						Helaas!
					</span>
				{/if}
			</button>
		</li>
	{/each}
</ul>
