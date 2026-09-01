<script lang="ts">
	/**
	 * Schrijven > Woorden: spelling up to ten words of the story letter by
	 * letter. See `docs/original-app/games.md`, "Schrijven > Woorden".
	 *
	 * The first letter is free and locked. Every wrong submit hands out one
	 * more letter as a hint; how many have been given away so far is derived
	 * straight from the stored item (`item.responses.length`), never kept in
	 * component state, which is what makes a half-finished item resumable: the
	 * boxes that were given away come back exactly as they were, and the ones
	 * the pupil was still typing start blank again.
	 *
	 * When a hint happens to complete the word, `LevelWriteWords.vue` (the
	 * original) appends that completed answer as a second response on top of
	 * the wrong attempt that triggered it, so the item costs a mistake for the
	 * wrong attempt on top of being finished by a hint rather than by the
	 * pupil. This game reproduces that: see `submit()`.
	 */
	import type { GameProps } from '$lib/components/games';
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import LetterBoxes, { type LetterResult } from '$lib/components/level/LetterBoxes.svelte';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import { loadStory } from '$lib/content';
	import { animationUrl } from '$lib/content/assets';
	import { LevelRun } from '$lib/game/level.svelte';
	import { gameRules } from '$lib/game/rules';
	import { completedByHint, maskedPrompt, revealedPositions, wordIndex } from '$lib/game/words';
	import { onMount } from 'svelte';
	import {
		boxLetters,
		isFilled,
		markLetters,
		writingGenerate,
		type WordInSentence
	} from './writingBoxes';
	import WritingPrompt from './WritingPrompt.svelte';
	import WrittenWord from './WrittenWord.svelte';

	let { category, section, level }: GameProps = $props();

	/** The first letter is always given away for free, and its box is locked. */
	const FREE_FIRST_LETTER = true;

	let run = $state<LevelRun | null>(null);
	let words = $state(new Map<string, WordInSentence>());
	let animation = $state<string | null>(null);

	onMount(async () => {
		const story = await loadStory(level.story);
		const rules = gameRules(category, section.id);
		if (!rules?.words) return;

		words = wordIndex(story);
		animation = animationUrl(story.image);
		run = new LevelRun({ level, rules, generate: () => writingGenerate(story, rules) });
	});

	/** The word (and the sentence it came from) the current item plays on. */
	const entry = $derived(run && !run.finished ? words.get(run.item?.source ?? '') : undefined);

	/**
	 * Wrong attempts recorded on the current item so far, fed to
	 * `revealedPositions()` as `events`. Reading this from the stored item
	 * rather than component state is what makes the level resumable.
	 */
	const events = $derived(run?.item ? run.item.responses.length : 0);

	const locked = $derived(
		entry ? revealedPositions(entry.word.text.length, FREE_FIRST_LETTER, events) : []
	);

	/** The pupil's own typed guesses; blank at a position that is locked. */
	let draft = $state<string[]>([]);
	let results = $state<LetterResult[]>([]);

	/**
	 * Resets the boxes for a fresh item. Does *not* run again for a wrong
	 * submit on the same item - `entry` only changes identity when the item
	 * itself does - so the pupil's other typed letters survive a mistake; only
	 * the newly locked position (handled by `boxLetters` below) changes.
	 */
	let trackedSource: string | null = null;
	$effect(() => {
		const source = entry?.word.key ?? null;
		if (source === trackedSource) return;
		trackedSource = source;
		draft = entry ? new Array(entry.word.text.length).fill('') : [];
		results = [];
	});

	const letters = $derived(entry ? boxLetters(entry.word.text, locked, draft) : []);
	const filled = $derived(isFilled(letters));

	/**
	 * Whether the current, already-answered item was finished by a hint rather
	 * than by the pupil. Derived from the stored responses instead of a flag
	 * set at submit time, because a hint-completion always appends a second,
	 * target-equal response on top of a wrong one (see `submit()`) - a pattern
	 * that shows up in storage on its own and so survives reopening the level
	 * on exactly this item, before "Doorgaan" was tapped.
	 */
	const hintCompleted = $derived(
		entry && run?.answered
			? completedByHint(entry.word.text.length, FREE_FIRST_LETTER, run.item.responses.length - 1)
			: false
	);

	function onletter(index: number, letter: string) {
		draft[index] = letter;
		results = [];
	}

	function submit() {
		if (!run || !entry || !filled) return;
		const target = entry.word.text;
		const attempt = [...letters];
		results = markLetters(attempt, target);
		run.respond(attempt);

		if (attempt.join('') === target) return;

		// A wrong attempt hands out one more hint letter. If that alone
		// completes the word, the original still records the completed answer
		// as its own response, so the hint costs an extra mistake on top of the
		// wrong attempt that triggered it.
		const nextEvents = run.item!.responses.length;
		if (completedByHint(target.length, FREE_FIRST_LETTER, nextEvents)) {
			run.respond([...target]);
		}
	}
</script>

<!-- The prompt card of docs/original-app/games.md: "Grunnegs" and "Nederlands". -->
{#snippet prompt()}
	{#if entry}
		<WritingPrompt
			prompt={maskedPrompt(entry.sentence, entry.word)}
			translation={entry.word.dutch}
		/>
	{/if}
{/snippet}

<LevelShell {category} {section} {run} {animation} top={entry ? prompt : undefined}>
	{#if run?.answered && entry}
		<ItemFeedback
			title={hintCompleted ? 'Jammer!' : 'Dat klopt!'}
			tone={hintCompleted ? 'wrong' : 'correct'}
			description="Het juist geschreven woord is:"
			onproceed={() => run?.proceed()}
		>
			<WrittenWord letters={[...entry.word.text]} />
		</ItemFeedback>
	{:else if entry}
		<div class="flex flex-col items-center gap-6">
			<LetterBoxes {letters} {locked} {results} {onletter} />
			{#if filled}
				<button
					type="button"
					onclick={submit}
					class="bg-accent rounded-full px-8 py-3 font-medium text-white transition hover:brightness-95 focus:brightness-95"
				>
					Versturen
				</button>
			{/if}
		</div>
	{/if}
</LevelShell>
