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

	interface Props {
		/** The current order, top to bottom. The caller owns the order. */
		rows: ReorderRow[];
		/** Keys given as a hint: locked in place and always marked correct. */
		locked?: string[];
		/** Per-key marker to show after a submit. Empty means no markers shown. */
		markers?: Record<string, RowMarker>;
		/** The "Gebruik de streepjes..." line above the list, or nothing. */
		instruction?: string | null;
		/** Defaults to "Versturen"; the timed variant may want "Volgende". */
		submitLabel?: string;
		/** Whether "Versturen" is enabled. */
		canSubmit?: boolean;
		/** The requested new order, as keys, top to bottom. */
		onreorder: (keys: string[]) => void;
		onsubmit: () => void;
	}

	let {
		rows,
		locked = [],
		markers = {},
		instruction = null,
		submitLabel = 'Versturen',
		canSubmit = true,
		onreorder,
		onsubmit
	}: Props = $props();

	/** The rows that can be dragged or moved, in their current relative order. */
	let movable = $derived(rows.filter((row) => !locked.includes(row.key)));

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

	/** Swaps a movable row with its neighbour above (-1) or below (1). */
	function move(key: string, direction: -1 | 1) {
		const index = movable.findIndex((row) => row.key === key);
		const target = index + direction;
		if (index < 0 || target < 0 || target >= movable.length) return;
		const reordered = [...movable];
		[reordered[index], reordered[target]] = [reordered[target], reordered[index]];
		emitReorder(reordered);
	}

	interface DragState {
		key: string;
		pointerId: number;
		/** `event.clientY` at the start of the gesture. */
		startClientY: number;
		/** Vertical centre of the dragged row before the gesture started. */
		originalCenter: number;
		/** The other movable rows' vertical centres, captured once at the start. */
		others: { key: string; mid: number }[];
	}

	let dragging = $state<DragState | null>(null);
	/** How far the dragged row has moved from its resting position, in pixels. */
	let dragOffset = $state(0);

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
		const rect = el.getBoundingClientRect();
		const others = movable
			.filter((row) => row.key !== key)
			.map((row) => {
				const otherRect = rowEls[row.key]?.getBoundingClientRect();
				return { key: row.key, mid: (otherRect?.top ?? 0) + (otherRect?.height ?? 0) / 2 };
			});
		dragging = {
			key,
			pointerId: event.pointerId,
			startClientY: event.clientY,
			originalCenter: rect.top + rect.height / 2,
			others
		};
		dragOffset = 0;
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		dragOffset = event.clientY - dragging.startClientY;
	}

	function endDrag(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		const { key, originalCenter, others } = dragging;
		const virtualCenter = originalCenter + dragOffset;
		const targetIndex = others.filter((row) => row.mid < virtualCenter).length;
		const draggedRow = movable.find((row) => row.key === key)!;
		const reordered = movable.filter((row) => row.key !== key);
		reordered.splice(targetIndex, 0, draggedRow);
		dragging = null;
		dragOffset = 0;
		emitReorder(reordered);
	}

	function cancelDrag(event: PointerEvent) {
		if (!dragging || event.pointerId !== dragging.pointerId) return;
		dragging = null;
		dragOffset = 0;
	}
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={endDrag}
	onpointercancel={cancelDrag}
/>

<div>
	{#if instruction}
		<p class="mb-3 text-sm text-slate-600">{instruction}</p>
	{/if}

	<ul class="flex flex-col gap-2">
		{#each rows as row (row.key)}
			{@const isLocked = locked.includes(row.key)}
			{@const marker = isLocked ? 'correct' : markers[row.key]}
			{@const index = movable.findIndex((r) => r.key === row.key)}
			{@const isDragging = dragging?.key === row.key}
			<li
				bind:this={rowEls[row.key]}
				class="relative flex items-center gap-2 rounded-xl bg-white p-2 shadow transition
					{isDragging ? 'z-10 shadow-xl select-none' : ''}"
				style={isDragging ? `transform: translateY(${dragOffset}px)` : undefined}
			>
				{#if isLocked}
					<span class="w-9 shrink-0"></span>
				{:else}
					<button
						type="button"
						aria-label="Sleephandvat"
						class="flex shrink-0 cursor-grab touch-none flex-col gap-1 p-2 active:cursor-grabbing"
						onpointerdown={(event) => startDrag(event, row.key)}
					>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
						<span class="block h-0.5 w-5 bg-slate-400"></span>
					</button>
				{/if}

				<div class="flex-1">
					{#if row.image}
						<img src={row.image} alt="" class="h-16 w-16 rounded-lg object-cover" />
					{:else}
						<p>{row.text}</p>
					{/if}
				</div>

				<div class="flex w-6 shrink-0 items-center justify-center" aria-hidden="true">
					{#if marker === 'correct'}
						<span class="[&>svg]:fill-accent"><Check /></span>
					{:else if marker === 'up'}
						<span class="[&>svg]:fill-primary"><Arrow /></span>
					{:else if marker === 'down'}
						<span class="[&>svg]:fill-primary block rotate-180"><Arrow /></span>
					{/if}
				</div>

				{#if !isLocked}
					<div class="flex shrink-0 flex-col gap-1">
						<button
							type="button"
							aria-label="Naar boven"
							disabled={index === 0}
							onclick={() => move(row.key, -1)}
							class="rounded p-1 transition enabled:hover:bg-slate-100 disabled:opacity-30 [&>svg]:fill-slate-500"
						>
							<Arrow />
						</button>
						<button
							type="button"
							aria-label="Naar beneden"
							disabled={index === movable.length - 1}
							onclick={() => move(row.key, 1)}
							class="rounded p-1 transition enabled:hover:bg-slate-100 disabled:opacity-30 [&>svg]:fill-slate-500"
						>
							<span class="block rotate-180"><Arrow /></span>
						</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<button
		type="button"
		disabled={!canSubmit}
		onclick={onsubmit}
		class="bg-secondary mt-4 w-full rounded-full py-3 font-medium text-white transition
			enabled:hover:brightness-95 enabled:focus:brightness-95 disabled:opacity-40"
	>
		{submitLabel}
	</button>
</div>
