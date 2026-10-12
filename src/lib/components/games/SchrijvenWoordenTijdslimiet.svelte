<script lang="ts">
	/**
	 * Schrijven > Woorden met tijdslimiet: the same spelling game as
	 * `SchrijvenWoorden.svelte`, but with no free head start and a clock that
	 * hands over one letter every `rules.secondsPerStep` seconds instead. See
	 * `docs/original-app/games.md`, "Schrijven > Woorden" and its timed
	 * variant paragraph.
	 *
	 * The rule that makes this game different from the untimed one, verified
	 * against `checkSeconds()` in `../vonj-app/app/pages/LevelWriteWords.vue`:
	 * an expiry here only reveals and locks the next letter and restarts the
	 * clock. It records no response, so - unlike the untimed game - running
	 * the clock down never costs score by itself; it only hands the answer
	 * over. There is no auto-submit either: once every letter has been given
	 * away the clock stops on its own (`Countdown` does this), but the pupil
	 * still has to press the button, which by then reads "Volgende" instead of
	 * "Versturen". Only `submit()` ever calls `run.respond()`.
	 *
	 * Resume limitation (see `docs/rewrite.md`): because an expiry writes
	 * nothing to storage, and a wrong submit and a timer expiry would be
	 * indistinguishable in storage anyway, how many letters the clock has
	 * given away lives only in this component's state. Reopening a level part
	 * way through an item restarts that item's clock and takes back the
	 * letters it had given, exactly like the original, which persisted no
	 * timer state either.
	 */
	import type { GameProps } from '$lib/components/games';
	import ItemFeedback from '$lib/components/level/ItemFeedback.svelte';
	import LetterBoxes, { type LetterResult } from '$lib/components/level/LetterBoxes.svelte';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import Timer from '$lib/components/level/Timer.svelte';
	import { loadStory } from '$lib/content';
	import { animationUrl } from '$lib/content/assets';
	import { LevelRun } from '$lib/game/level.svelte';
	import { getLanguage } from '$lib/languages';
	import { gameRules } from '$lib/game/rules';
	import { Countdown } from '$lib/game/timer.svelte';
	import { maskedPrompt, revealedPositions, wordIndex, writtenForm } from '$lib/game/words';
	import { onMount, untrack } from 'svelte';
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

	/** No letter is given for free in the timed variant. */
	const FREE_FIRST_LETTER = false;

	let run = $state<LevelRun | null>(null);
	let words = $state(new Map<string, WordInSentence>());
	let animation = $state<string | null>(null);
	/** `rules.secondsPerStep`, read once the rules are known. Never hardcoded. */
	let secondsPerStep = $state(0);

	onMount(async () => {
		const story = await loadStory(level.language, level.story);
		const rules = gameRules(category, section.id);
		if (!rules?.secondsPerStep) return;

		secondsPerStep = rules.secondsPerStep;
		words = wordIndex(story);
		animation = animationUrl(level.language, story.image);
		run = new LevelRun({ level, rules, generate: () => writingGenerate(story, rules) });
	});

	/** The word (and the sentence it came from) the current item plays on. */
	const entry = $derived(run && !run.finished ? words.get(run.item?.source ?? '') : undefined);

	/**
	 * How many letters the clock has handed over on this item, kept only in
	 * component state - see the file comment above.
	 */
	let given = $state(0);
	/** The word as it is typed: see `writtenForm()`. */
	const spelling = $derived(entry ? writtenForm(entry.word) : '');

	const locked = $derived(
		entry ? revealedPositions(spelling.length, FREE_FIRST_LETTER, given) : []
	);

	/** The pupil's own typed guesses; blank at a position that is locked. */
	let draft = $state<string[]>([]);
	let results = $state<LetterResult[]>([]);
	let countdown = $state<Countdown | null>(null);
	/** Whether every letter had already been given away when the pupil last submitted correctly. */
	let timedOut = $state(false);

	/**
	 * The item the boxes and the clock below belong to. A key rather than the
	 * item itself, because only a change of item may reset them: the effect
	 * used to read `run.answered`, which reads the item's responses, so every
	 * wrong submit re-ran it, wiped the typed letters and the marking, took
	 * back the letters the clock had given and restarted the clock.
	 */
	const itemKey = $derived(
		run && entry && secondsPerStep ? `${run.items.length}:${run.index}:${entry.word.key}` : null
	);

	/**
	 * A fresh item: reset the boxes, clear the "Jammer!" flag and start a new
	 * clock for it. The countdown is destroyed whenever the item changes and
	 * when the component is torn down, so no interval is ever left running. It
	 * is not started at all for an item that is already answered, which is
	 * what a level resumed on its last, unproceeded item looks like.
	 */
	$effect(() => {
		if (!itemKey) {
			countdown = null;
			return;
		}
		return untrack(() => {
			if (!entry || run?.answered) {
				countdown = null;
				return;
			}
			const wordLength = spelling.length;

			draft = new Array(wordLength).fill('');
			results = [];
			given = 0;
			timedOut = false;

			const clock = new Countdown({
				secondsPerStep,
				steps: wordLength,
				onexpire: () => {
					// Only reveals and locks the next letter; never records a response
					// (see the file comment above), so this never costs score.
					given += 1;
				}
			});
			countdown = clock;
			clock.start();

			return () => clock.destroy();
		});
	});

	const letters = $derived(entry ? boxLetters(spelling, locked, draft) : []);
	const filled = $derived(isFilled(letters));

	function onletter(index: number, letter: string) {
		draft[index] = letter.toLowerCase();
		results = [];
	}

	function submit() {
		if (!run || !entry || !filled) return;
		const target = spelling;
		const attempt = [...letters];
		results = markLetters(attempt, target);
		run.respond(attempt);

		if (run.answered) {
			// A correct answer stops the clock immediately. If every letter had
			// already been given away by the time the pupil submits, the
			// feedback says "Jammer!" instead of "Dat klopt!", even though this
			// tap is what actually records it.
			timedOut = countdown?.timeUp ?? false;
			countdown?.stop();
		}
	}

	/** "Volgende" once the clock has handed over the whole word; "Versturen" until then. */
	const submitLabel = $derived(countdown?.timeUp ? 'Volgende' : 'Versturen');
</script>

<!-- The prompt card sits next to the timer here, since there is no play button to share it with (docs/original-app/level-shell.md). -->
{#snippet top()}
	<div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
		{#if entry}
			<div class="flex-1">
				<WritingPrompt
					language={level.language}
					prompt={maskedPrompt(entry.sentence, entry.word)}
					translation={entry.word.dutch}
				/>
			</div>
		{/if}
		{#if countdown}
			<Timer
				totalSecondsLeft={countdown.totalSecondsLeft}
				secondsUntilHint={countdown.secondsLeft}
				timeUp={countdown.timeUp}
			/>
		{/if}
	</div>
{/snippet}

<LevelShell
	language={level.language}
	{category}
	{section}
	{run}
	{animation}
	top={entry && !run?.answered ? top : undefined}
>
	{#if run?.answered && entry}
		<ItemFeedback
			title={timedOut ? 'Jammer!' : 'Dat klopt!'}
			tone={timedOut ? 'wrong' : 'correct'}
			description="Het juist geschreven woord is:"
			onproceed={() => run?.proceed()}
		>
			<WrittenWord language={level.language} letters={[...spelling]} />
		</ItemFeedback>
	{:else if entry}
		<div class="flex flex-col items-center gap-6">
			<LetterBoxes
				{letters}
				lang={getLanguage(level.language).lang}
				{locked}
				{results}
				{onletter}
				onsubmit={submit}
			/>
			{#if filled}
				<button
					type="button"
					onclick={submit}
					class="bg-accent rounded-full px-8 py-3 font-medium text-white transition hover:brightness-95 focus:brightness-95"
				>
					{submitLabel}
				</button>
			{/if}
		</div>
	{/if}
</LevelShell>
