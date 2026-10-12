<script module lang="ts">
	/** One row of the list. */
	export interface ReorderRow {
		/** The key the answer is recorded as. */
		key: string;
		/** The row's text, for the sentence game. */
		text?: string;
		/** The row's illustration URL, for the recap item. */
		image?: string;
	}

	/** What a row shows after a submit: right place, or which way it must move. */
	export type RowMarker = 'correct' | 'up' | 'down';
</script>

<script lang="ts">
	/**
	 * The shared drag-and-drop list behind Lezen > Zinnen and the recap item of
	 * Luisteren > Verhaaltjes. See `docs/original-app/games.md`, "Drag-and-drop
	 * list".
	 *
	 * The original app used native HTML5 drag and drop, which is poor on touch,
	 * the primary platform this app runs on. This component uses pointer events
	 * instead, plus a visible up/down button pair per row. The buttons are not a
	 * hidden fallback: they are real controls that also make the list operable
	 * by keyboard. No drag-and-drop library is used.
	 *
	 * The component is presentational: `rows` is the order as the caller has
	 * it, top to bottom. Dragging a row or pressing an up/down button never
	 * changes local state, it reports the requested new order through
	 * `onreorder` and waits for the caller to pass a new `rows`. Locked rows
	 * (given as a hint) keep their absolute position in the list; the other
	 * rows are reordered only among themselves and can never be dragged past a
	 * locked row.
	 */
	import Check from '$lib/icons/check.svelte';
	import Arrow from '$lib/icons/arrow.svelte';
	import { onDestroy, tick, type Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';

	interface Props {
		/** The current order, top to bottom. The caller owns the order. */
		rows: ReorderRow[];
		/** Keys given as a hint: locked in place and always marked correct. */
		locked?: string[];
		/** Per-key marker to show after a submit. Empty means no markers shown. */
		markers?: Record<string, RowMarker>;
		/** The "Gebruik de streepjes..." line above the list, or nothing. */
		instruction?: string | null;
		/**
		 * The language of the text rows, which are always sentence chunks in the
		 * language being taught, as a `lang` attribute: "gos" or "act".
		 */
		lang?: string;
		/** Defaults to "Versturen"; the timed variant may want "Volgende". */
		submitLabel?: string;
		/** Whether "Versturen" is enabled. */
		canSubmit?: boolean;
		/**
		 * The "Nog niet alle ... staan op de juiste plaats" message after a wrong
		 * submit. Shown right above "Versturen", where the pupil's eyes and
		 * finger are: above the list it was off the screen on a phone.
		 */
		alert?: Snippet;
		/** The requested new order, as keys, top to bottom. */
		onreorder: (keys: string[]) => void;
		onsubmit: () => void;
	}

	let {
		rows,
		locked = [],
		markers = {},
		instruction = null,
		lang,
		submitLabel = 'Versturen',
		canSubmit = true,
		alert,
		onreorder,
		onsubmit
	}: Props = $props();

	/** The rows that can be dragged or moved, in their current relative order. */
	let movable = $derived(rows.filter((row) => !locked.includes(row.key)));

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	/**
	 * How long a row takes to slide to a new place, in milliseconds. Short and
	 * flat: a child pressing the arrows repeatedly must not have to wait for the
	 * list to settle, and the buttons stay under the same finger throughout. The
	 * default `flip` duration scales with the distance travelled and is far too
	 * slow for that, so it is replaced by this fixed one, and dropped altogether
	 * when the reader has asked for less motion.
	 */
	const SLIDE_MS = 180;
	let slideMs = $derived(reducedMotion.current ? 0 : SLIDE_MS);

	/** Used for a move that has already happened: a button press, or a drop. */
	let slide = $derived({ duration: slideMs, easing: cubicOut });

	/** DOM elements of the rows, keyed by row key, for measuring during a drag. */
	let rowEls: Record<string, HTMLLIElement> = $state({});

	/**
	 * Turns a requested order of the movable rows into a full order, by
	 * dropping each locked row back into the absolute position it already
	 * has, and filling the remaining positions from `newMovable`.
	 */
	function emitReorder(newMovable: ReorderRow[]) {
		let index = 0;
		const order = rows.map((row) => (locked.includes(row.key) ? row : newMovable[index++]));
		onreorder(order.map((row) => row.key));
	}

	/** The up and down buttons per row key, to put focus back after a move. */
	const upButtons: Record<string, HTMLButtonElement | undefined> = $state({});
	const downButtons: Record<string, HTMLButtonElement | undefined> = $state({});

	/**
	 * Puts focus back on the row that was just moved. A move disables the button
	 * that was pressed as soon as the row reaches the top or the bottom, and a
	 * disabled button drops focus to the document, which used to send a keyboard
	 * user back to the top of the page for every single move. The other button of
	 * the same row is always still enabled, so it takes over.
	 */
	async function refocus(key: string, direction: -1 | 1) {
		await tick();
		const pressed = direction === -1 ? upButtons[key] : downButtons[key];
		const other = direction === -1 ? downButtons[key] : upButtons[key];
		const target = pressed && !pressed.disabled ? pressed : other;
		target?.focus();
	}

	/** Swaps a movable row with its neighbour above (-1) or below (1). */
	function move(key: string, direction: -1 | 1) {
		const index = movable.findIndex((row) => row.key === key);
		const target = index + direction;
		if (index < 0 || target < 0 || target >= movable.length) return;
		const reordered = [...movable];
		[reordered[index], reordered[target]] = [reordered[target], reordered[index]];
		emitReorder(reordered);
		refocus(key, direction);
	}

	interface DragState {
		key: string;
		pointerId: number;
		/** The pointer's position on the page at the start of the gesture. */
		startPageY: number;
		/** Vertical centre of the dragged row on the page before the gesture started. */
		originalCenter: number;
		/**
		 * Where every row, locked ones included, sat on the page when the gesture
		 * started, top to bottom. Captured once, because the rows are moved with
		 * `transform` during the drag and so keep reporting the same layout. Page
		 * coordinates rather than viewport ones, so the list can scroll under the
		 * finger while it drags.
		 */
		layout: { key: string; top: number; height: number }[];
		/** The vertical centres of the movable rows, the slots a drop chooses between. */
		slots: { key: string; mid: number }[];
		/**
		 * How far the dragged row may go up and down: its centre stays within the
		 * list, so it can pass the first and the last row but not wander off over
		 * the button below.
		 */
		minOffset: number;
		maxOffset: number;
	}

	/** The space between two rows, `gap-2` on the list, in pixels. */
	const ROW_GAP = 8;

	let dragging = $state<DragState | null>(null);
	/** How far the dragged row has moved from its resting position, in pixels. */
	let dragOffset = $state(0);
	/** The pointer's last position in the viewport, for scrolling near the edges. */
	let pointerY = 0;
	let scrollFrame = 0;

	/** The slot the dragged row would drop into: the number of other rows whose
	 * centre it has passed. -1 when nothing is being dragged. */
	let dropIndex = $derived.by(() => {
		if (!dragging) return -1;
		const virtualCenter = dragging.originalCenter + dragOffset;
		return dragging.slots.filter((slot) => slot.key !== dragging!.key && slot.mid < virtualCenter)
			.length;
	});

	/**
	 * How far each row that is not being dragged has to move to make room,
	 * given where the drop would currently land. Worked out by laying the list
	 * out again in that order, row heights and all, so a tall row and a short
	 * one make room by what they really need and a locked row stays put.
	 */
	let previewOffsets = $derived.by(() => {
		const offsets: Record<string, number> = {};
		if (!dragging || dropIndex < 0) return offsets;
		const { key, layout } = dragging;
		const order = movable.filter((row) => row.key !== key).map((row) => row.key);
		order.splice(dropIndex, 0, key);
		let next = 0;
		let y = layout[0]?.top ?? 0;
		for (const slot of layout) {
			const placed = locked.includes(slot.key) ? slot.key : order[next++];
			const height = layout.find((entry) => entry.key === placed)?.height ?? 0;
			const original = layout.find((entry) => entry.key === placed)?.top ?? y;
			offsets[placed] = y - original;
			y += height + ROW_GAP;
		}
		return offsets;
	});

	/**
	 * Where a row sits during a drag. The dragged row follows the pointer; the
	 * rows whose centre it has passed have already given up their slot, so the
	 * gap it will fall into is visible before the finger lifts. Only those rows
	 * get a transition: the dragged one has to track the pointer exactly. The
	 * `cubic-bezier` is the CSS twin of `cubicOut`, so making room and the flip
	 * after the drop move at the same rate.
	 */
	function dragStyle(key: string): string | undefined {
		if (!dragging) return undefined;
		if (dragging.key === key) return `transform: translateY(${dragOffset}px)`;
		if (locked.includes(key)) return undefined;
		return `transform: translateY(${previewOffsets[key] ?? 0}px);
			transition: transform ${slideMs}ms cubic-bezier(0.33, 1, 0.68, 1)`;
	}

	function startDrag(event: PointerEvent, key: string) {
		if (locked.includes(key)) return;
		const el = rowEls[key];
		if (!el) return;
		event.preventDefault();
		try {
			el.setPointerCapture(event.pointerId);
		} catch {
			// Not every pointer (or test harness) supports capture; the window
			// listeners below still receive the move and up events regardless.
		}
		const scrollY = window.scrollY;
		const layout = rows.map((row) => {
			const rect = rowEls[row.key]?.getBoundingClientRect();
			return { key: row.key, top: (rect?.top ?? 0) + scrollY, height: rect?.height ?? 0 };
		});
		const own = layout.find((entry) => entry.key === key)!;
		const first = layout[0];
		const last = layout[layout.length - 1];
		dragging = {
			key,
			pointerId: event.pointerId,
			startPageY: event.clientY + scrollY,
			originalCenter: own.top + own.height / 2,
			layout,
			slots: layout
				.filter((entry) => !locked.includes(entry.key))
				.map((entry) => ({ key: entry.key, mid: entry.top + entry.height / 2 })),
			minOffset: first.top - (own.top + own.height / 2),
			maxOffset: last.top + last.height - (own.top + own.height / 2)
		};
		dragOffset = 0;
		pointerY = event.clientY;
		scrollFrame = requestAnimationFrame(autoScroll);
	}

	/** Follows the pointer, held within the list. */
	function follow() {
		if (!dragging) return;
		const offset = pointerY + window.scrollY - dragging.startPageY;
		dragOffset = Math.min(dragging.maxOffset, Math.max(dragging.minOffset, offset));
	}

	/**
	 * Scrolls the page while the pointer is held near the top or the bottom of
	 * the screen, faster the closer it gets, so a row can be dragged to a place
	 * that was not on the screen when the drag started. A whole story is longer
	 * than a phone screen.
	 */
	function autoScroll() {
		if (!dragging) return;
		const edge = 80;
		const height = window.innerHeight;
		let speed = 0;
		if (pointerY < edge) speed = -Math.ceil(((edge - pointerY) / edge) * 14);
		else if (pointerY > height - edge)
			speed = Math.ceil(((pointerY - (height - edge)) / edge) * 14);
		if (speed !== 0) {
			window.scrollBy(0, speed);
			follow();
		}
		scrollFrame = requestAnimationFrame(autoScroll);
	}

	function stopScrolling() {
		cancelAnimationFrame(scrollFrame);
		scrollFrame = 0;
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		pointerY = event.clientY;
		follow();
	}

	function endDrag(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		stopScrolling();
		const { key } = dragging;
		const targetIndex = dropIndex;
		const draggedRow = movable.find((row) => row.key === key)!;
		const reordered = movable.filter((row) => row.key !== key);
		reordered.splice(targetIndex, 0, draggedRow);
		// The rows that made room are already standing in their new places, so
		// the flip that follows has nothing left to move for them.
		dragging = null;
		dragOffset = 0;
		emitReorder(reordered);
	}

	function cancelDrag(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		stopScrolling();
		dragging = null;
		dragOffset = 0;
	}

	onDestroy(stopScrolling);
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={endDrag}
	onpointercancel={cancelDrag}
/>

<div>
	{#if instruction}
		<!--
		  The original's line, verbatim, and then the buttons it does not know
		  about: this list is equally playable with them, and only with them by
		  keyboard. See docs/rewrite.md, "Reordering is dragged or buttoned".
		-->
		<p class="mb-3 text-sm text-white">
			{instruction} Of gebruik de pijltjes om een item omhoog of omlaag te zetten.
		</p>
	{/if}

	<ul class="flex flex-col gap-2">
		{#each rows as row (row.key)}
			{@const isLocked = locked.includes(row.key)}
			{@const marker = isLocked ? 'correct' : markers[row.key]}
			{@const index = movable.findIndex((r) => r.key === row.key)}
			{@const isDragging = dragging?.key === row.key}
			<!--
			  `animate:flip` moves a row to its new place once the order has really
			  changed; during a drag the rows are moved by `transform` instead, see
			  `dragStyle`. Only the shadow transitions from the class list: a
			  transform must not, or a dragged row would lag behind the pointer.

			  Every row is at least as tall as its buttons, locked or not, so a
			  locked row is not a thin strip between taller ones. The buttons sit
			  side by side rather than stacked, which keeps a one-line row one line
			  high.
			-->
			<li
				bind:this={rowEls[row.key]}
				animate:flip={slide}
				class="relative flex min-h-14 items-center gap-2 rounded-xl bg-white p-2 shadow transition-shadow
					{dragging ? 'select-none' : ''} {isDragging ? 'z-10 shadow-xl' : ''}"
				style={dragStyle(row.key)}
			>
				<!--
				  The result of a submit, as a badge on the row's left edge: a filled
				  circle, so a red "move up" reads as a verdict and not as a third
				  arrow button beside the two grey ones.
				-->
				<div class="absolute top-1/2 -left-2.5 -translate-y-1/2" aria-hidden="true">
					{#if marker}
						<span
							data-marker={marker}
							class="flex size-7 items-center justify-center rounded-full shadow-md [&_svg]:size-5
								[&_svg]:fill-white {marker === 'correct' ? 'bg-accent' : 'bg-wrong'}"
						>
							{#if marker === 'correct'}
								<Check />
							{:else if marker === 'up'}
								<Arrow />
							{:else}
								<span class="block rotate-180"><Arrow /></span>
							{/if}
						</span>
					{/if}
				</div>

				{#if isLocked}
					<span class="w-10 shrink-0"></span>
				{:else}
					<!--
					  Out of the tab order and out of the accessibility tree: the handle
					  only listens for a pointer, so Enter and Space did nothing on it,
					  and the up and down buttons beside it are the keyboard way to move
					  a row. It keeps its label for the tests that use it to tell a
					  movable row from a locked one.
					-->
					<button
						type="button"
						tabindex="-1"
						aria-hidden="true"
						aria-label="Sleephandvat"
						class="flex size-10 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-1
							active:cursor-grabbing"
						onpointerdown={(event) => startDrag(event, row.key)}
					>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
					</button>
				{/if}

				<div class="min-w-0 flex-1">
					{#if row.image}
						<img
							src={row.image}
							alt=""
							class="aspect-[4/3] w-full max-w-40 rounded-lg object-cover"
						/>
					{:else}
						<!-- A text row is always a sentence chunk; an image row is a fragment. -->
						<p {lang}>{row.text}</p>
					{/if}
				</div>

				{#if !isLocked}
					<div class="flex shrink-0 gap-1">
						<button
							type="button"
							bind:this={upButtons[row.key]}
							aria-label="Naar boven"
							disabled={index === 0}
							onclick={() => move(row.key, -1)}
							class="flex size-10 items-center justify-center rounded-lg bg-slate-100 transition
								enabled:hover:bg-slate-200 disabled:opacity-30 [&_svg]:size-7 [&_svg]:fill-slate-600"
						>
							<Arrow />
						</button>
						<button
							type="button"
							bind:this={downButtons[row.key]}
							aria-label="Naar beneden"
							disabled={index === movable.length - 1}
							onclick={() => move(row.key, 1)}
							class="flex size-10 items-center justify-center rounded-lg bg-slate-100 transition
								enabled:hover:bg-slate-200 disabled:opacity-30 [&_svg]:size-7 [&_svg]:fill-slate-600"
						>
							<span class="block rotate-180"><Arrow /></span>
						</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	{#if alert}
		<div class="mt-4">{@render alert()}</div>
	{/if}

	<!--
	  Green, like every other "Versturen" in the app: the page behind this button
	  is `--color-secondary`, so a secondary button sat on its own colour.
	-->
	<button
		type="button"
		disabled={!canSubmit}
		onclick={onsubmit}
		class="bg-accent mt-4 w-full rounded-full py-3 font-medium text-white transition
			enabled:hover:brightness-95 enabled:focus:brightness-95 disabled:opacity-40"
	>
		{submitLabel}
	</button>
</div>
