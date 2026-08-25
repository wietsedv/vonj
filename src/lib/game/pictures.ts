/**
 * The picture-matching games: one fragment of a story, and a grid of
 * illustrations to pick the matching one from.
 *
 * Lezen > Verhaaltjes plays this on the text of a fragment and Luisteren >
 * Verhaaltjes on its recording, so everything both need lives here and only the
 * prompt differs per game. See `docs/original-app/games.md`.
 */
import { fragmentDistractors } from '$lib/game/generate';
import type { Fragment, StoredItem, Story } from '$lib/types';

/**
 * A fragment shorter than this is never an item of its own: too little to read
 * and too little to hear. See `docs/original-app/content.md`.
 */
const MIN_SECONDS = 2;

/** The widest grid shows six options, so five distractors are stored per item. */
export const MAX_DISTRACTORS = 5;

/** The fragments of a story that are long enough to be played on their own. */
export const pictureFragments = (story: Story): Fragment[] =>
	story.fragments.filter((fragment) => fragment.time[1] - fragment.time[0] >= MIN_SECONDS);

/**
 * One item per fragment of the story, in story order, each with the distractors
 * the hardest grid needs. The difficulty here is a placeholder: `LevelRun`
 * stamps the starting difficulty of the section over it.
 */
export function fragmentItems(story: Story, stories: readonly Story[]): StoredItem[] {
	return pictureFragments(story).map((fragment) => ({
		source: fragment.key,
		target: [fragment.key],
		distractors: [
			fragmentDistractors(stories, fragment, MAX_DISTRACTORS).map((option) => option.key)
		],
		responses: [],
		difficulty: 0
	}));
}

/** How many options an item shows: 4 at difficulty 0, 5 at 1, 6 at 2. */
export const optionCount = (difficulty: number): number => 4 + Math.min(Math.max(difficulty, 0), 2);

/**
 * Where the right answer sits among the options. Derived from the item rather
 * than drawn, so tapping a wrong card never moves the cards out from under the
 * pupil's finger, and reopening a level shows the grid it showed before, the
 * way the stored distractors do.
 */
function targetPosition(item: StoredItem, count: number): number {
	let hash = 0;
	for (let i = 0; i < item.source.length; i++) {
		hash = (hash * 31 + item.source.charCodeAt(i)) % 1000003;
	}
	return hash % count;
}

/**
 * The option keys of an item, in the order they are shown: as many of the
 * stored distractors as the difficulty asks for, with the target among them.
 */
export function pictureOptions(item: StoredItem): string[] {
	const distractors = item.distractors[0] ?? [];
	const count = Math.min(optionCount(item.difficulty), distractors.length + 1);
	const options = distractors.slice(0, count - 1);
	options.splice(targetPosition(item, count), 0, item.target[0]);
	return options;
}

/**
 * Every fragment of every story by key, for turning an option key back into the
 * illustration to show for it.
 */
export const fragmentIndex = (stories: readonly Story[]): Map<string, Fragment> =>
	new Map(stories.flatMap((story) => story.fragments.map((fragment) => [fragment.key, fragment])));

/**
 * The text shown for a fragment: its first sentence, not the whole fragment.
 * That is what the original app reads out of the content set.
 */
export const fragmentText = (fragment: Fragment): string => fragment.sentences[0]?.text ?? '';
