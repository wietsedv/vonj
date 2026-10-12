<script module lang="ts">
	import type { SoundFieldResult } from './SoundField.svelte';

	/** One column: the sound position the pupil is building, left to right. */
	export interface SoundColumn {
		/**
		 * Candidate sounds offered for this position, in the order shown. The
		 * correct sound is always among them; the rest are drawn at random from
		 * the sound inventory by the game.
		 */
		candidates: string[];
		/** The sound currently chosen for this position, or null if none yet. */
		chosen: string | null;
		/**
		 * True once the clock has given this column away: it is shown correct
		 * regardless of `result`, and its candidates cannot be tapped any more.
		 * See "Timers" in docs/original-app/games.md.
		 */
		locked?: boolean;
		/**
		 * This column's result after a submit. Null before submitting, and reset
		 * to null once the pupil changes an unlocked choice.
		 */
		result?: SoundFieldResult;
	}
</script>

<script lang="ts">
	import Arrow from '$lib/icons/arrow.svelte';
	import SoundField from './SoundField.svelte';

	interface Props {
		/** One column per sound of the word, left to right. */
		columns: SoundColumn[];
		/**
		 * Index of the column whose chosen sound is currently sounding, so its
		 * display field scales up while it plays. Null when nothing is playing.
		 * The game drives playback (`$lib/game/audio.ts`); this component only
		 * reflects it.
		 */
		sounding?: number | null;
		/** Tapping a candidate: the game records it and plays it. */
		onselect: (column: number, sound: string) => void;
		/** Tapping the display field: the game replays the sound already chosen. */
		onreplay: (column: number) => void;
	}

	let { columns, sounding = null, onselect, onreplay }: Props = $props();

	let scroller = $state<HTMLDivElement | undefined>();
	/** Whether columns are hidden past the left or the right edge of the strip. */
	let hiddenLeft = $state(false);
	let hiddenRight = $state(false);

	function measure() {
		if (!scroller) return;
		const { scrollLeft, scrollWidth, clientWidth } = scroller;
		hiddenLeft = scrollLeft > 1;
		hiddenRight = scrollLeft + clientWidth < scrollWidth - 1;
	}

	// Measured again whenever the strip or its columns change size: a new
	// item, a turned phone, or the page growing wider.
	$effect(() => {
		if (!scroller) return;
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		for (const child of scroller.children) observer.observe(child);
		measure();
		return () => observer.disconnect();
	});

	/** Scrolls the strip by about one screenful, for the arrows at its edges. */
	function scrollBy(direction: -1 | 1) {
		if (!scroller) return;
		scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' });
	}

	/**
	 * Fades the strip out towards an edge that has columns behind it. With the
	 * columns flush against the edge of the strip, nothing else told a pupil
	 * that a word had more sounds than the ones in view.
	 */
	const fade = $derived.by(() => {
		if (!hiddenLeft && !hiddenRight) return undefined;
		const left = hiddenLeft ? 'transparent, black 2.5rem' : 'black';
		const right = hiddenRight ? 'black calc(100% - 2.5rem), transparent' : 'black';
		return `mask-image: linear-gradient(to right, ${left}, ${right})`;
	});
</script>

<!--
  A single row of columns. They share the width they have, between 3.25rem and
  5rem each, so up to six sounds fit a phone and ten fit a desktop. The row is
  wider than the 36rem column the rest of the level sits in, up to the width of
  the screen, since a ten-sound word needs the room and nothing else on the
  screen is beside it. Past that it scrolls on its own, without the page
  scrolling with it, and fades out towards the side that has more columns, with
  an arrow there to scroll it. `justify-center-safe` centres the columns while
  they fit and falls back to the start edge once they overflow, so the first
  column stays reachable. See the "Layout" note in games.md and the
  "Responsive check" item in TODO.md.

  Each column is two white cards - the display field, then the candidates - as
  in the original app, where both were a `CardView`. The page behind them is
  `--color-secondary`, so without the cards the blue of a chosen candidate
  would sit on the same blue.
-->
<div class="relative w-[min(calc(100vw-2rem),60rem)] max-w-none">
	<div
		bind:this={scroller}
		onscroll={measure}
		class="w-full overflow-x-auto overscroll-x-contain py-3"
		style={fade}
	>
		<ol class="flex justify-center-safe gap-1.5">
			{#each columns as column, index (index)}
				{@const effectiveResult = column.locked ? 'correct' : (column.result ?? null)}
				<li class="max-w-20 min-w-13 flex-1 basis-0">
					<!--
					  Ten columns are otherwise one flat run of one-letter buttons, with
					  nothing tying a candidate to the position it fills. The group and
					  its name give every button a column to belong to, which is also
					  the only way the position is announced at all while its display
					  field is still empty and therefore disabled.
					-->
					<div
						role="group"
						aria-label={`Klank ${index + 1} van ${columns.length}`}
						class="flex w-full flex-col items-center gap-3"
					>
						<div class="w-full rounded-xl bg-white p-1 shadow-md">
							<SoundField
								sound={column.chosen}
								result={effectiveResult}
								sounding={sounding === index}
								label={column.chosen
									? `Klank "${column.chosen}" opnieuw afspelen`
									: `Klank ${index + 1}, nog niet gekozen`}
								onclick={() => onreplay(index)}
							/>
						</div>
						<ol class="flex w-full flex-col gap-1.5 rounded-xl bg-white p-1 shadow-md">
							{#each column.candidates as candidate (candidate)}
								{@const active = column.chosen === candidate}
								<li>
									<button
										type="button"
										disabled={column.locked}
										aria-pressed={active}
										onclick={(event) => {
											event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
											onselect(index, candidate);
										}}
										class="block min-h-11 w-full rounded-lg border-2 py-2 text-center font-medium transition
											enabled:hover:brightness-95 enabled:focus:brightness-95
											{active ? 'border-secondary bg-secondary text-white' : 'border-gray-300 bg-gray-50 text-gray-800'}"
									>
										{candidate}
									</button>
								</li>
							{/each}
						</ol>
					</div>
				</li>
			{/each}
		</ol>
	</div>

	<!--
	  Out of the tab order and the accessibility tree: the strip itself scrolls
	  to whichever column has focus, so these are for a finger or a mouse only.
	-->
	{#if hiddenLeft}
		<button
			type="button"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => scrollBy(-1)}
			class="absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full
				bg-white shadow-lg [&>span>svg]:fill-slate-600"
		>
			<span class="-rotate-90"><Arrow /></span>
		</button>
	{/if}
	{#if hiddenRight}
		<button
			type="button"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => scrollBy(1)}
			class="absolute top-1/2 right-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full
				bg-white shadow-lg [&>span>svg]:fill-slate-600"
		>
			<span class="rotate-90"><Arrow /></span>
		</button>
	{/if}
</div>
