<script lang="ts">
	/**
	 * Lezen > Zinnen met tijdslimiet: the same reordering game as
	 * `LezenZinnen.svelte`, but with no free head start and a clock that hands
	 * over one row every `rules.secondsPerStep` seconds instead. See
	 * `docs/original-app/games.md`, "Lezen > Zinnen", its "Timed variant"
	 * paragraph, and "The three timed sections do not agree on what an expiry
	 * costs".
	 *
	 * The rule that makes this game different from the untimed one: an expiry
	 * here hands over a row for free and records no response (verified against
	 * `checkSeconds()` in `../vonj-app/app/pages/LevelReadSentences.vue`, which
	 * only increments a hint counter). Running the clock down never costs
	 * score; it only changes the feedback title to "Jammer!" once every row was
	 * given away by the time the pupil submits. `run.respond` is therefore only
	 * ever called from `submit()`, on an actual "Versturen" tap.
	 *
	 * Resume limitation (see `docs/rewrite.md`, "The timed games do not
	 * remember their clock"): because an expiry writes nothing to storage, the
	 * expiry count lives only in this component's state. Reopening a level part
	 * way through an item restarts that item's clock and takes back the rows
	 * the clock had given, exactly like the original, which persisted no timer
	 * state either.
	 */
	import type { GameProps } from '$lib/components/games';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import type { RowMarker } from '$lib/components/level/ReorderList.svelte';
	import Timer from '$lib/components/level/Timer.svelte';
	import { loadStory } from '$lib/content';
	import { LevelRun } from '$lib/game/level.svelte';
	import { gameRules } from '$lib/game/rules';
	import {
		rowIndex,
		rowMarkers,
		sentenceItems,
		startingRows,
		timedGivenCount
	} from '$lib/game/sentences';
	import { Countdown } from '$lib/game/timer.svelte';
	import { onMount } from 'svelte';
	import SentenceBoard from './SentenceBoard.svelte';
	import SentenceFeedback from './SentenceFeedback.svelte';
	import SentenceResultCard from './SentenceResultCard.svelte';

	let { category, section, level }: GameProps = $props();

	let run = $state<LevelRun | null>(null);
	/** Row key to Gronings text, computed from the story once it is loaded. */
	let index = $state(new Map<string, string>());
	/** `rules.secondsPerStep`, read once the rules are known. Never hardcoded. */
	let secondsPerStep = $state(0);

	onMount(async () => {
		const story = await loadStory(level.story);
		const rules = gameRules(category, section.id);
		if (!rules?.secondsPerStep) return;

		secondsPerStep = rules.secondsPerStep;
		index = rowIndex(story);
		run = new LevelRun({ level, rules, generate: () => sentenceItems(story) });
	});

	/** The current row order, top to bottom. Not persisted, same as the untimed game. */
	let order = $state<string[]>([]);
	/** Markers from the last wrong submit; cleared as soon as the pupil reorders. */
	let markers = $state<Record<string, RowMarker>>({});
	/** How many rows the clock has given away for this item. Lives only here; see the file comment above. */
	let expiries = $state(0);
	/** Whether every row had already been given away by the clock when the pupil last submitted correctly. */
	let timedOut = $state(false);
	let countdown = $state<Countdown | null>(null);

	/** Rows given away by the clock so far, capped at the item's row count. There is no free head start here. */
	const given = $derived(run?.item ? timedGivenCount(expiries, run.item.target.length) : 0);
	const locked = $derived(run?.item ? run.item.target.slice(0, given) : []);

	/**
	 * A fresh item: start fully shuffled (no head start), clear the markers and
	 * the "Jammer!" flag, and start a new clock for it. The countdown is
	 * destroyed whenever the item changes and when the component is torn down,
	 * so no interval is ever left running.
	 */
	$effect(() => {
		if (!run?.item || !secondsPerStep) return;
		const item = run.item;

		order = startingRows(item, 0);
		markers = {};
		expiries = 0;
		timedOut = false;

		const clock = new Countdown({
			secondsPerStep,
			steps: item.target.length,
			onexpire: () => {
				// Hands the next row over for free: no `run.respond` call, so this
				// never costs score (see the file comment above).
				expiries += 1;
				const givenKeys = item.target.slice(0, timedGivenCount(expiries, item.target.length));
				order = [...givenKeys, ...order.filter((key) => !givenKeys.includes(key))];
			}
		});
		countdown = clock;
		clock.start();

		return () => clock.destroy();
	});

	function reorder(keys: string[]) {
		order = keys;
		markers = {};
	}

	function submit() {
		if (!run?.item) return;
		run.respond(order);
		if (run.answered) {
			// A correct answer stops the clock immediately.
			timedOut = countdown?.timeUp ?? false;
			markers = {};
			countdown?.stop();
		} else {
			markers = rowMarkers(run.item, order);
		}
	}
</script>

<!-- The timer sits alone in the top area (docs/original-app/level-shell.md), stacked above the "Resultaat" card. -->
{#snippet topArea()}
	<div class="flex flex-col gap-4">
		{#if countdown}
			<Timer
				totalSecondsLeft={countdown.totalSecondsLeft}
				secondsUntilHint={countdown.secondsLeft}
				timeUp={countdown.timeUp}
			/>
		{/if}
		<SentenceResultCard {order} {index} />
	</div>
{/snippet}

<LevelShell {category} {section} {run} top={run?.item && !run.answered ? topArea : undefined}>
	{#if run?.item && run.answered}
		<SentenceFeedback
			item={run.item}
			{index}
			title={timedOut ? 'Jammer!' : 'Dat klopt!'}
			tone={timedOut ? 'wrong' : 'correct'}
			onproceed={() => run?.proceed()}
		/>
	{:else if run?.item}
		<SentenceBoard {order} {index} {locked} {markers} onreorder={reorder} onsubmit={submit} />
	{/if}
</LevelShell>
