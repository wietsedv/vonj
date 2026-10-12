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

<!--
  Two columns, so four options are two rows and six are three, as in the
  original. Narrower than the column on a wide screen, so the bottom row is not
  below the fold. An odd last card sits centred under the others rather than
  alone in the left column.
-->
<ul class="mx-auto grid max-w-md grid-cols-2 gap-3">
	{#each options as option, index (option.key)}
		{@const locked = wrong.includes(option.key)}
		{@const alone = index === options.length - 1 && options.length % 2 === 1}
		<li class={alone ? 'col-span-2 mx-auto w-[calc(50%-0.375rem)]' : undefined}>
			<button
				type="button"
				disabled={locked}
				onclick={() => onselect(option.key)}
				aria-label={`Plaatje ${index + 1} van ${options.length}${locked ? ', helaas, fout' : ''}`}
				class="relative block w-full overflow-hidden rounded-2xl bg-white shadow-lg transition
					enabled:hover:brightness-95 enabled:focus:brightness-95"
			>
				<img src={option.image} alt="" class="aspect-square w-full object-cover" />
				{#if locked}
					<!-- Translucent, so the picture that was picked stays visible underneath. -->
					<span
						aria-hidden="true"
						class="bg-wrong/50 absolute inset-0 flex items-center justify-center text-xl text-white"
					>
						Helaas!
					</span>
				{/if}
			</button>
		</li>
	{/each}
</ul>
