<script lang="ts">
	/**
	 * Spreken > Korte, Normale en Lange woorden: one component for all three
	 * sections. They differ only in the rules `gameRules(category, section.id)`
	 * returns - word length and starting candidate count - so the section id is
	 * never hardcoded here. See `docs/original-app/games.md`, "Spreken > Korte,
	 * Normale en Lange woorden", plus the shared "Items" and "Adaptive
	 * difficulty" sections.
	 *
	 * The pupil is given the Dutch word, with no audio prompt at all, and
	 * builds the Gronings pronunciation sound by sound - the mirror image of
	 * `LuisterenWoorden.svelte`, which gives the recording and asks for the
	 * same sounds. Both share the sound-column state machine `SoundAnswer`
	 * (`soundAnswer.svelte.ts`) and `SoundFeedback.svelte`; this game never
	 * passes a `translation` to the feedback card, because the pupil already
	 * had the Dutch word as the prompt.
	 */
	import type { GameProps } from '$lib/components/games';
	import LevelShell from '$lib/components/level/LevelShell.svelte';
	import SoundColumns from '$lib/components/level/SoundColumns.svelte';
	import { loadStory } from '$lib/content';
	import { animationUrl, wordUrl } from '$lib/content/assets';
	import { selectWords, type WordInSentence } from '$lib/game/generate';
	import { LevelRun } from '$lib/game/level.svelte';
	import { gameRules } from '$lib/game/rules';
	import { soundItems, wordIndex } from '$lib/game/words';
	import { onDestroy, onMount } from 'svelte';
	import { SoundAnswer } from './soundAnswer.svelte';
	import SoundFeedback from './SoundFeedback.svelte';
	import SoundSubmitBar from './SoundSubmitBar.svelte';

	let { category, section, level }: GameProps = $props();

	let run = $state<LevelRun | null>(null);
	let words = $state(new Map<string, WordInSentence>());
	let animation = $state<string | null>(null);
	let answer = $state<SoundAnswer | null>(null);

	onMount(async () => {
		const story = await loadStory(level.story);
		const rules = gameRules(category, section.id);
		if (!rules?.words) return;

		words = wordIndex(story);
		animation = animationUrl(story.image);
		run = new LevelRun({
			level,
			rules,
			generate: () => soundItems(selectWords(story, rules.words!))
		});
		answer = new SoundAnswer({ run, wordAudioUrl: () => (entry ? wordUrl(entry.word) : null) });
	});

	onDestroy(() => answer?.destroy());

	/** The item being played right now, or undefined once the level is finished. */
	const item = $derived(run && !run.finished ? run.item : undefined);
	/** The word (and the sentence it came from) the current item plays on. */
	const entry = $derived(item ? words.get(item.source) : undefined);

	/**
	 * A fresh item: reset the answer state. Does not run again for a wrong
	 * submit on the same item - `item` only changes identity when the item
	 * itself does.
	 */
	let trackedSource: string | null = null;
	$effect(() => {
		if (!item || !answer) return;
		if (item.source === trackedSource) return;
		trackedSource = item.source;
		answer.reset(item);
	});
</script>

<!-- The "Nederlands" prompt card of docs/original-app/games.md, this game's top area. -->
{#snippet prompt()}
	{#if entry}
		<div class="rounded-2xl bg-white px-6 py-5 shadow-lg">
			<p class="text-sm font-medium text-gray-500">Nederlands</p>
			<p class="mt-1 text-lg">{entry.word.dutch}</p>
		</div>
	{/if}
{/snippet}

<LevelShell {category} {section} {run} {animation} top={entry ? prompt : undefined}>
	{#if run?.answered && item && answer}
		<SoundFeedback
			sounds={item.target}
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
				onsubmit={() => answer?.submit()}
			/>
		</div>
	{/if}
</LevelShell>
