<script module lang="ts">
	/** How a box is coloured once its letter has been marked. Never used alone: see the icon below. */
	export type LetterResult = 'correct' | 'wrong' | null;
</script>

<script lang="ts">
	import Check from '$lib/icons/check.svelte';
	import Cross from '$lib/icons/cross.svelte';

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
		/** A box's letter changed by typing, pasting, or a backspace. */
		onletter: (index: number, letter: string) => void;
	}

	let { letters, locked = [], results = [], readonly = false, onletter }: Props = $props();

	let inputs: (HTMLInputElement | undefined)[] = $state([]);

	const isLocked = (index: number) => locked[index] ?? false;
	const isEditable = (index: number) => !readonly && !isLocked(index);
	/** The locked letter is never in doubt, whatever a stale `results` entry says. */
	const resultOf = (index: number): LetterResult =>
		isLocked(index) ? 'correct' : (results[index] ?? null);

	const tone: Record<'correct' | 'wrong', string> = {
		correct: 'border-accent bg-accent/10',
		wrong: 'border-primary bg-primary/10'
	};

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
	 * and the keystroke lands after the character that is already there, where
	 * `maxlength` swallows it without firing `input` at all. Typing a word
	 * straight through leaves focus on the last box, so that used to be exactly
	 * the letter that could not be retyped. Taking the insertion over here
	 * settles it before either rule can apply.
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

  Boxes wrap onto extra rows rather than shrink or scroll the page, since a
  word can run to fifteen letters on a 320px phone.
-->
<div lang="gos" class="flex flex-wrap justify-center gap-1.5">
	{#each letters as letter, index (index)}
		{@const result = resultOf(index)}
		{@const editable = isEditable(index)}
		<!--
		  The ring sits on the box, not on the input inside it, so the whole
		  bordered square lights up: `outline-none` on the input alone left a
		  keyboard user with no way to tell which letter they were typing.
		-->
		<span
			class="focus-within:ring-secondary relative flex size-9 items-center justify-center
				rounded-lg border-2 focus-within:ring-2 focus-within:ring-offset-1 {result
				? tone[result]
				: 'border-gray-300 bg-white'}"
		>
			<input
				bind:this={inputs[index]}
				type="text"
				inputmode="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				maxlength="1"
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
				class="size-full rounded-lg bg-transparent text-center text-lg font-semibold outline-none"
			/>
			{#if result === 'correct'}
				<span
					class="[&>svg]:fill-accent pointer-events-none absolute -right-1 -bottom-1 [&>svg]:size-3"
				>
					<Check />
				</span>
			{:else if result === 'wrong'}
				<span
					class="[&>svg]:fill-primary pointer-events-none absolute -right-1 -bottom-1 [&>svg]:size-3"
				>
					<Cross />
				</span>
			{/if}
		</span>
	{/each}
</div>
