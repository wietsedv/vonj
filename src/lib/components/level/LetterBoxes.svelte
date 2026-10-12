<script module lang="ts">
	/** How a box is coloured once its letter has been marked. Never used alone: see the icon below. */
	export type LetterResult = 'correct' | 'wrong' | null;
</script>

<script lang="ts">
	import Check from '$lib/icons/check.svelte';
	import Cross from '$lib/icons/cross.svelte';
	import { untrack } from 'svelte';

	interface Props {
		/**
		 * One entry per letter of the word, in order. The caller owns these: this
		 * component keeps no copy of its own and only reports changes through
		 * `onletter`. An empty string is a box not filled in yet.
		 */
		letters: string[];
		/**
		 * Which positions were given for free or handed out as a hint. A locked
		 * box cannot be edited and is always shown as correct, whatever `results`
		 * says about it. Defaults to no position locked.
		 */
		locked?: boolean[];
		/**
		 * The verdict for each position after a submit, in the same order as
		 * `letters`. Defaults to no verdict anywhere.
		 */
		results?: LetterResult[];
		/**
		 * Read-only display, as on the feedback card's "Het juist geschreven
		 * woord is:": no input and no focus, just the letters in the same boxes.
		 */
		readonly?: boolean;
		/** The language the word is written in, as a `lang` attribute: "gos" or "act". */
		lang?: string;
		/** A box's letter changed by typing, pasting, or a backspace. */
		onletter: (index: number, letter: string) => void;
		/**
		 * Enter in any box, the on-screen keyboard's own submit key included. On
		 * a phone the keyboard covers the "Versturen" button below the boxes, so
		 * this is the way to send without closing the keyboard first.
		 */
		onsubmit?: () => void;
	}

	let {
		letters,
		locked = [],
		results = [],
		readonly = false,
		lang,
		onletter,
		onsubmit
	}: Props = $props();

	let inputs: (HTMLInputElement | undefined)[] = $state([]);

	const isLocked = (index: number) => locked[index] ?? false;
	const isEditable = (index: number) => !readonly && !isLocked(index);
	/** The locked letter is never in doubt, whatever a stale `results` entry says. */
	const resultOf = (index: number): LetterResult =>
		isLocked(index) ? 'correct' : (results[index] ?? null);

	// Solid tints: a translucent one let the blue page show through, so a marked
	// box turned into a blue square.
	const tone: Record<'correct' | 'wrong', string> = {
		correct: 'border-accent bg-green-50',
		wrong: 'border-wrong bg-red-50'
	};

	/**
	 * After a wrong submit, focus goes to the first letter that was wrong, so
	 * the pupil can type over it straight away instead of tapping back into
	 * the boxes first.
	 */
	$effect(() => {
		if (readonly) return;
		const wrong = results.findIndex((result, index) => result === 'wrong' && !isLocked(index));
		if (wrong >= 0) untrack(() => inputs[wrong]?.focus());
	});

	/*
	 * How big the boxes are and how many go on a line, worked out from the width
	 * there is. A word stays on one line as long as its boxes can stay at least
	 * MIN_BOX wide; a longer one wraps into lines of equal length at the full
	 * size: twelve letters as six and six rather than eight and four, nineteen
	 * as five, five, five and four rather than nine, nine and one.
	 */
	let available = $state(0);
	/** The gap between boxes, `gap-1.5`, in pixels. */
	const GAP = 6;
	const MIN_BOX = 34;
	const layout = $derived.by(() => {
		if (!available || letters.length === 0) return null;
		const count = letters.length;
		const preferred = available >= 500 ? 48 : 44;
		const sizeFor = (perRow: number) =>
			Math.min(preferred, Math.floor((available - GAP * (perRow - 1)) / perRow));
		if (sizeFor(count) >= MIN_BOX) return { size: sizeFor(count), perRow: count };
		const fit = Math.max(1, Math.floor((available + GAP) / (preferred + GAP)));
		const perRow = Math.ceil(count / Math.ceil(count / fit));
		return { size: sizeFor(perRow), perRow };
	});

	/**
	 * The letter positions of each line. Lines differ by one box at most, the
	 * longer ones first: 19 letters on lines of seven are seven, six and six.
	 * One line holding everything, left to wrap by itself, until the width is
	 * known.
	 */
	const lines = $derived.by(() => {
		const positions = letters.map((_, index) => index);
		if (!layout) return [positions];
		const count = Math.ceil(positions.length / layout.perRow);
		const base = Math.floor(positions.length / count);
		const longer = positions.length % count;
		const result: number[][] = [];
		let start = 0;
		for (let line = 0; line < count; line++) {
			const length = base + (line < longer ? 1 : 0);
			result.push(positions.slice(start, start + length));
			start += length;
		}
		return result;
	});

	/** The next box that can still be typed into, or null past the last letter. */
	function nextEditable(from: number): number | null {
		for (let index = from + 1; index < letters.length; index++) {
			if (isEditable(index)) return index;
		}
		return null;
	}

	/** The previous box that can still be typed into, or null before the first letter. */
	function prevEditable(from: number): number | null {
		for (let index = from - 1; index >= 0; index--) {
			if (isEditable(index)) return index;
		}
		return null;
	}

	function focusBox(index: number | null) {
		inputs[index ?? -1]?.focus();
	}

	function handleInput(index: number, event: Event) {
		if (!isEditable(index)) return;
		const target = event.currentTarget as HTMLInputElement;
		// A mobile IME can report a multi-character composed value, and a paste can
		// land several characters in one box. Either way only the first one counts.
		// This, and not a `maxlength="1"` on the input, is what keeps a box to one
		// letter: a full box with `maxlength` set makes WebKit fire `beforeinput`
		// with empty `data`, which leaves `handleBeforeInput` below nothing to
		// insert and makes a typed letter impossible to overwrite there.
		const letter = target.value.slice(0, 1);
		target.value = letter;
		onletter(index, letter);
		if (letter) focusBox(nextEditable(index));
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		if (!isEditable(index)) return;
		const target = event.currentTarget as HTMLInputElement;
		if (event.key === 'Backspace' && target.value === '') {
			// Nothing to delete here, so the original moves focus back instead.
			event.preventDefault();
			focusBox(prevEditable(index));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			onsubmit?.();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			focusBox(prevEditable(index));
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			focusBox(nextEditable(index));
		}
	}

	/** Typing over an existing letter replaces it, rather than adding a second character. */
	function selectAll(event: FocusEvent) {
		(event.currentTarget as HTMLInputElement).select();
	}

	/**
	 * Typing a letter always replaces whatever the box holds, wherever the caret
	 * happens to sit.
	 *
	 * Selecting the box's content on focus is not enough on its own: clicking a
	 * box that already has focus fires no focus event, so nothing gets selected
	 * and the keystroke lands after the character that is already there. Typing
	 * a word straight through leaves focus on the last box, so that used to be
	 * exactly the letter that could not be retyped. Taking the insertion over
	 * here settles it before either rule can apply.
	 */
	function handleBeforeInput(index: number, event: InputEvent) {
		if (!isEditable(index)) return;
		// Only a plain typed character: a paste carries its text in
		// `dataTransfer` and a composition is still being edited, and both are
		// handled by `handleInput` once the browser is done with them.
		if (event.inputType !== 'insertText' || !event.data) return;
		event.preventDefault();
		const target = event.currentTarget as HTMLInputElement;
		const letter = event.data.slice(0, 1);
		target.value = letter;
		onletter(index, letter);
		focusBox(nextEditable(index));
	}
</script>

<!--
  One single-character input per letter, for Schrijven > Woorden (and its timed
  variant) and for the feedback card's "Het juist geschreven woord is:", which
  reuses this component in `readonly` mode. See docs/original-app/games.md,
  "Schrijven > Woorden", and the "Per-item feedback card" section of
  docs/original-app/level-shell.md.

  Boxes wrap onto extra rows of equal length rather than shrink or scroll the
  page, since a word can run to nineteen letters on a 320px phone.
-->
<div bind:clientWidth={available} {lang} class="flex w-full flex-col items-center gap-1.5">
	{#each lines as line, number (number)}
		<div class="flex flex-wrap justify-center gap-1.5">
			{#each line as index (index)}
				{@const letter = letters[index]}
				{@const result = resultOf(index)}
				{@const editable = isEditable(index)}
				<!--
				  The ring sits on the box, not on the input inside it, so the whole
				  bordered square lights up: `outline-none` on the input alone left a
				  keyboard user with no way to tell which letter they were typing.
				-->
				<span
					class="focus-within:ring-secondary relative flex size-10 shrink-0 items-center justify-center
					rounded-lg border-2 focus-within:ring-2 focus-within:ring-offset-1 {result
						? tone[result]
						: 'border-gray-300 bg-white'}"
					style:width={layout ? `${layout.size}px` : undefined}
					style:height={layout ? `${layout.size}px` : undefined}
				>
					<input
						bind:this={inputs[index]}
						type="text"
						inputmode="text"
						enterkeyhint="send"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						spellcheck="false"
						readonly={!editable}
						tabindex={editable ? 0 : -1}
						aria-label={`Letter ${index + 1} van ${letters.length}`}
						aria-readonly={!editable}
						aria-invalid={result === 'wrong'}
						value={letter}
						onbeforeinput={(event) => handleBeforeInput(index, event)}
						oninput={(event) => handleInput(index, event)}
						onkeydown={(event) => handleKeydown(index, event)}
						onfocus={selectAll}
						class="size-full rounded-lg bg-transparent text-center text-xl font-semibold outline-none"
					/>
					{#if result === 'correct'}
						<span
							class="[&>svg]:fill-accent pointer-events-none absolute -top-2 -right-2 rounded-full bg-white p-0.5
							shadow [&>svg]:size-3.5"
						>
							<Check />
						</span>
					{:else if result === 'wrong'}
						<span
							class="[&>svg]:fill-wrong pointer-events-none absolute -top-2 -right-2 rounded-full bg-white p-0.5
							shadow [&>svg]:size-3.5"
						>
							<Cross />
						</span>
					{/if}
				</span>
			{/each}
		</div>
	{/each}
</div>
