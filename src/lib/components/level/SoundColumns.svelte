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
</script>

<!--
  A single horizontally scrolling row, so a ten-sound word still fits a narrow
  phone without widening the page itself. `overflow-x-auto` on this element
  keeps the scrolling contained; the page around it never gains a scrollbar.
  The columns sit centred while they fit; `justify-center-safe` falls back to
  the start edge once they overflow, so the first column stays reachable.
  See the "Layout" note in games.md and the "Responsive check" item in TODO.md.

  Each column is two white cards - the display field, then the candidates - as
  in the original app, where both were a `CardView`. The page behind them is
  `--color-secondary`, so without the cards the blue of a chosen candidate
  would sit on the same blue.
-->
<div class="w-full overflow-x-auto overscroll-x-contain py-3">
	<ol class="flex justify-center-safe gap-3 px-1">
		{#each columns as column, index (index)}
			{@const effectiveResult = column.locked ? 'correct' : (column.result ?? null)}
			<li class="xs:w-20 w-16 shrink-0">
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
					<div class="w-full rounded-xl bg-white p-1.5 shadow-md">
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
					<ol class="flex w-full flex-col gap-1.5 rounded-xl bg-white p-1.5 shadow-md">
						{#each column.candidates as candidate (candidate)}
							{@const active = column.chosen === candidate}
							<li>
								<button
									type="button"
									disabled={column.locked}
									aria-pressed={active}
									onclick={() => onselect(index, candidate)}
									class="block w-full rounded-lg border-2 py-2 text-center font-medium transition
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
