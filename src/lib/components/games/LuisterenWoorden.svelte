<script lang="ts">
	/**
	 * Luisteren > Woorden: hearing a word and reconstructing which Gronings
	 * sounds it is made of. See `docs/original-app/games.md`, "Luisteren >
	 * Woorden".
	 *
	 * There is no text prompt at all - the pupil has to hear the word - so the
	 * top area is only the `AudioPlayer` on the word's own recording, playing
	 * on its own as soon as it is ready (or degrading to a play button, see
	 * `docs/rewrite.md`, "Audio autoplay is attempted, and degrades to a play
	 * button"). `LuisterenWoordenTijdslimiet.svelte` plays the same items
	 * against a clock; both share the sound-column state machine `SoundAnswer`
	 * (`soundAnswer.svelte.ts`) and `SoundFeedback.svelte` with
	 * `SprekenWoorden.svelte`, the mirror game that gives the Dutch word
	 * instead of the recording.
	 */
	import type { GameProps } from '$lib/components/games';
	import AudioPlayer from '$lib/components/level/AudioPlayer.svelte';
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

<!-- The audio player of docs/original-app/games.md, this game's top area. No text prompt. -->
{#snippet player()}
	{#if entry}
		<AudioPlayer src={wordUrl(entry.word)} autoplay />
	{/if}
{/snippet}

<LevelShell {category} {section} {run} {animation} top={entry ? player : undefined}>
	{#if run?.answered && item && answer}
		<SoundFeedback
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
				onsubmit={() => answer?.submit()}
			/>
		</div>
	{/if}
</LevelShell>
