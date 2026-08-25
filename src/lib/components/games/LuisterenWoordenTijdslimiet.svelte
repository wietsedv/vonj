<script lang="ts">
	/**
	 * Luisteren > Woorden met tijdslimiet: the same sound-reconstruction game as
	 * `LuisterenWoorden.svelte`, but with a clock that gives away one sound
	 * every `rules.secondsPerStep` seconds instead of the pupil having
	 * unlimited time. See `docs/original-app/games.md`, "Luisteren > Woorden"
	 * and its timed variant paragraph, plus "The three timed sections do not
	 * agree on what an expiry costs" under "Shared mechanics".
	 *
	 * This is the one timed section where an expiry records a response of its
	 * own - verified against `checkSeconds()` in
	 * `../vonj-app/app/pages/LevelListenWords.vue` - so running the clock down
	 * costs score here, unlike Lezen > Zinnen met tijdslimiet and Schrijven >
	 * Woorden met tijdslimiet, where an expiry hands over part of the answer
	 * for free. Once the last sound has been given away the item has, by
	 * construction, just become complete, so it submits itself; the original
	 * records a further response on top of the expiry's own one for that final
	 * hint, which this reproduces in `onexpire` below. The feedback card then
	 * says "Jammer!" instead of "Dat klopt!", the only thing that marks the
	 * difference to the pupil, and a wrong *manual* submit plays back the word
	 * recording only, not the pupil's chosen sounds - `playChosenOnWrongSubmit:
	 * false` below.
	 *
	 * Because an expiry is a real response, it survives storage on its own,
	 * which lets this section - uniquely among the three timed ones, see
	 * `docs/rewrite.md`, "The timed games do not remember their clock" -
	 * resume a half-answered item without re-revealing, and re-charging, sounds
	 * the clock already gave away: `resumeGivenCount()` (`soundGame.ts`) reads
	 * how many leading columns of the item's last response already match the
	 * target, and seeds `answer.reset()` with them locked.
	 */
	import type { GameProps } from '$lib/components/games';
	import AudioPlayer from '$lib/components/level/AudioPlayer.svelte';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import SoundColumns from '$lib/components/level/SoundColumns.svelte';
	import Timer from '$lib/components/level/Timer.svelte';
	import { loadStory } from '$lib/content';
	import { animationUrl, wordUrl } from '$lib/content/assets';
	import { selectWords, type WordInSentence } from '$lib/game/generate';
	import { LevelRun } from '$lib/game/level.svelte';
	import { gameRules } from '$lib/game/rules';
	import { Countdown } from '$lib/game/timer.svelte';
	import { soundItems, wordIndex } from '$lib/game/words';
	import { onDestroy, onMount } from 'svelte';
	import { SoundAnswer } from './soundAnswer.svelte';
	import SoundFeedback from './SoundFeedback.svelte';
	import { resumeGivenCount } from './soundGame';
	import SoundSubmitBar from './SoundSubmitBar.svelte';

	let { category, section, level }: GameProps = $props();

	let run = $state<LevelRun | null>(null);
	let words = $state(new Map<string, WordInSentence>());
	let animation = $state<string | null>(null);
	let answer = $state<SoundAnswer | null>(null);
	/** `rules.secondsPerStep`, read once the rules are known. Never hardcoded. */
	let secondsPerStep = $state(0);

	onMount(async () => {
		const story = await loadStory(level.story);
		const rules = gameRules(category, section.id);
		if (!rules?.words || !rules.secondsPerStep) return;

		secondsPerStep = rules.secondsPerStep;
		words = wordIndex(story);
		animation = animationUrl(story.image);
		run = new LevelRun({
			level,
			rules,
			generate: () => soundItems(selectWords(story, rules.words!))
		});
		answer = new SoundAnswer({
			run,
			wordAudioUrl: () => (entry ? wordUrl(entry.word) : null),
			// A wrong manual submit plays only the word recording, never the
			// pupil's chosen sounds, in this section only. See the file comment.
			playChosenOnWrongSubmit: false
		});
	});

	onDestroy(() => answer?.destroy());

	/** The item being played right now, or undefined once the level is finished. */
	const item = $derived(run && !run.finished ? run.item : undefined);
	/** The word (and the sentence it came from) the current item plays on. */
	const entry = $derived(item ? words.get(item.source) : undefined);

	let countdown = $state<Countdown | null>(null);
	/** Whether the current, already-answered item was finished by the clock rather than the pupil. */
	let timedOut = $state(false);

	/**
	 * A fresh item: reset the answer, seeded with whatever the clock already
	 * gave away on an earlier visit (`resumeGivenCount()`), and start a new
	 * clock for the sounds still left - 15 seconds per remaining sound. The
	 * countdown is destroyed whenever the item changes and when the component
	 * is torn down, so no interval is ever left running; it is not started at
	 * all for an item that is already answered, which is what a level resumed
	 * on its last, unproceeded item looks like.
	 */
	$effect(() => {
		if (!run || !item || !answer || !secondsPerStep || run.answered) {
			countdown = null;
			return;
		}
		const activeRun = run;
		const activeItem = item;
		const activeAnswer = answer;

		const given = resumeGivenCount(activeItem);
		const locked = activeItem.target.map((_, index) => index < given);
		activeAnswer.reset(activeItem, locked);
		timedOut = false;

		const remaining = activeItem.target.length - given;
		if (remaining <= 0) {
			countdown = null;
			return;
		}

		const clock = new Countdown({
			secondsPerStep,
			steps: remaining,
			onexpire: () => {
				const index = activeAnswer.locked.findIndex((isLocked) => !isLocked);
				if (index === -1) return;

				// The clock gives the next sound away, plays it, and locks it in.
				activeAnswer.reveal(index);
				activeAnswer.replay(index);

				// Unique to this section (see the file comment above): an expiry
				// records a response, so running the clock down costs score here.
				activeRun.respond(activeAnswer.answer());

				if (activeRun.answered) {
					// The sound just given away was the last one, so the answer is now
					// complete and the item submits itself. The original records a
					// further response on top of the expiry's own one for this last
					// hint, which this reproduces.
					activeRun.respond(activeAnswer.answer());
					timedOut = true;
					activeAnswer.playAsCorrect();
				}
			}
		});
		countdown = clock;
		clock.start();

		return () => clock.destroy();
	});

	function submit() {
		if (!answer) return;
		answer.submit();
		// A correct answer stops the clock immediately.
		if (run?.answered) countdown?.stop();
	}
</script>

<!-- The player sits next to the timer here, per docs/original-app/level-shell.md. -->
{#snippet top()}
	<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
		{#if entry}
			<AudioPlayer src={wordUrl(entry.word)} autoplay />
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

<LevelShell {category} {section} {run} {animation} top={entry && !run?.answered ? top : undefined}>
	{#if run?.answered && item && answer}
		<SoundFeedback
			title={timedOut ? 'Jammer!' : 'Dat klopt!'}
			tone={timedOut ? 'wrong' : 'correct'}
			sounds={item.target}
			translation={entry?.word.dutch}
			sounding={answer.soundingIndex}
			onreplay={(sound) => answer?.replay(item.target.indexOf(sound))}
			onproceed={() => run?.proceed()}
		/>
	{:else if entry && answer && item}
		<div class="flex flex-col items-center gap-6">
			<SoundColumns
				columns={answer.columns(item)}
				sounding={answer.soundingIndex}
				onselect={(column, sound) => answer?.select(column, sound)}
				onreplay={(column) => answer?.replay(column)}
			/>
			<SoundSubmitBar
				canSubmit={answer.canSubmit}
				incomplete={answer.incomplete}
				onsubmit={submit}
			/>
		</div>
	{/if}
</LevelShell>
