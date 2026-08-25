/**
 * The shared building blocks for generating a level's items.
 *
 * A level's items are generated once and then stored, so nothing here has to be
 * reproducible: `Math.random` is fine, and the picked distractors and the word
 * order come back from `localStorage` rather than from a seed. See
 * `docs/rewrite.md`.
 *
 * The per-game item lists that use these live with their games; this module only
 * holds what more than one of them needs.
 */
import { distractorSounds } from '$lib/content';
import type { WordSelection } from '$lib/game/rules';
import type { Fragment, Sentence, Story, Word } from '$lib/types';

/* -------------------------------------------------------------------------- */
/* Picking                                                                    */
/* -------------------------------------------------------------------------- */

/** A copy of `items` in random order, Fisher-Yates. */
export function shuffled<T>(items: readonly T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/** Up to `count` of `items`, drawn at random. Fewer if there are not enough. */
export const pick = <T>(items: readonly T[], count: number): T[] =>
	shuffled(items).slice(0, Math.max(0, count));

/* -------------------------------------------------------------------------- */
/* Picture distractors                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Wrong illustrations for a fragment item, drawn from the fragments of every
 * story. Fragments that share the target's illustration are never offered, so a
 * distractor can never be right.
 */
export function fragmentDistractors(
	stories: readonly Story[],
	target: Fragment,
	count: number
): Fragment[] {
	const candidates = stories
		.flatMap((story) => story.fragments)
		.filter((fragment) => fragment.image !== target.image);
	return pick(candidates, count);
}

/**
 * Wrong illustrations for the whole-story item: the overview illustration of
 * every other story. There are only three, which is why that item never has
 * more than four options.
 */
export const storyDistractors = (stories: readonly Story[], target: Story): Story[] =>
	stories.filter((story) => story.key !== target.key);

/* -------------------------------------------------------------------------- */
/* Sound distractors                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Wrong sounds for one column, drawn from the Gronings sound inventory. The
 * target sound is excluded, and so are the sounds that are never offered as a
 * distractor.
 */
export const soundDistractors = (target: string, count: number): string[] =>
	pick(
		distractorSounds.filter((sound) => sound.sound !== target).map((sound) => sound.sound),
		count
	);

/* -------------------------------------------------------------------------- */
/* Words                                                                      */
/* -------------------------------------------------------------------------- */

/** A word together with the sentence it was taken from. */
export interface WordInSentence {
	word: Word;
	sentence: Sentence;
}

/** Every word of a story that carries a translation and a recording. */
export function storyWords(story: Story): WordInSentence[] {
	return story.fragments.flatMap((fragment) =>
		fragment.sentences.flatMap((sentence) => sentence.words.map((word) => ({ word, sentence })))
	);
}

const fits = (word: Word, selection: WordSelection): boolean => {
	if (selection.minLetters !== undefined && word.text.length < selection.minLetters) return false;
	if (selection.dutch && !word.dutch) return false;
	if (selection.sounds) {
		const [min, max] = selection.sounds;
		if (word.sounds.length < min || word.sounds.length > max) return false;
	}
	return true;
};

/**
 * The words one level of a word game is played on: the words of the story that
 * fit the section's selection, de-duplicated by their Gronings spelling, in
 * random order, capped at the section's count.
 *
 * De-duplication keeps the first occurrence, so a word is always shown in the
 * sentence it first appears in.
 */
export function selectWords(story: Story, selection: WordSelection): WordInSentence[] {
	const bySpelling = new Map<string, WordInSentence>();
	for (const entry of storyWords(story)) {
		if (!fits(entry.word, selection)) continue;
		if (!bySpelling.has(entry.word.text)) bySpelling.set(entry.word.text, entry);
	}
	return pick([...bySpelling.values()], selection.count);
}
