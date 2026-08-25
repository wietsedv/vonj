/**
 * The picture-matching games: an illustration to identify from a prompt, and a
 * grid of options to pick it from.
 *
 * Lezen > Verhaaltjes plays only one kind of item, one per story fragment
 * (`fragmentItems`), on the text of the fragment. Luisteren > Verhaaltjes plays
 * that same kind on the fragment's recording instead, plus two more: a
 * whole-story item first and a recap item last (`pictureItems` builds the full
 * list). Everything all three need lives here. See
 * `docs/original-app/games.md`.
 */
import { fragmentDistractors, shuffled, storyDistractors } from '$lib/game/generate';
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

/**
 * Which of the three kinds of item of Luisteren > Verhaaltjes a `StoredItem`
 * is: a grid item that plays the whole story recording and offers the four
 * story illustrations, a grid item that plays one fragment and offers
 * fragment illustrations (what `fragmentItems` builds and what Lezen >
 * Verhaaltjes plays exclusively), or the reorder item that recaps the story.
 * A `StoredItem` cannot carry this itself (`target`/`distractors` are just
 * string lists), so the game is told explicitly rather than having to infer
 * it from an item's shape.
 */
export type PictureItemKind = 'story' | 'fragment' | 'recap';

/** One item of a level, tagged with which kind of item it is. */
export interface PictureItem {
	kind: PictureItemKind;
	item: StoredItem;
}

/**
 * The whole-story item: the complete recording plays, and the options are the
 * four story overview illustrations, one per story in the content set. Only
 * three distractors ever exist, which is why `pictureOptions` never grows this
 * one past four, whatever the difficulty.
 */
export function wholeStoryItem(story: Story, stories: readonly Story[]): StoredItem {
	return {
		source: story.key,
		target: [story.key],
		distractors: [storyDistractors(stories, story).map((option) => option.key)],
		responses: [],
		difficulty: 0
	};
}

/**
 * The recap item: every fragment illustration of the story, to be dragged into
 * story order. This uses every fragment, not only the ones long enough for
 * `fragmentItems` to play on their own: `../vonj-app/app/pages/
 * LevelListenStory.vue` builds its recap from `targetData.data`, the story's
 * full, unfiltered fragment list.
 *
 * The starting order is a shuffle of the target, stored once, exactly as
 * `sentences.ts`'s `rowItem` does for its reordering items; nothing here is
 * specific to pictures.
 */
export function recapItem(story: Story): StoredItem {
	const target = story.fragments.map((fragment) => fragment.key);
	return {
		source: story.key,
		target,
		distractors: [shuffled(target)],
		responses: [],
		difficulty: 0
	};
}

/**
 * The recap always gives away its first row for free, locked at the top and
 * pre-marked correct, whatever the difficulty. `docs/original-app/games.md`
 * does not mention this; it comes from `../vonj-app/app/pages/
 * LevelListenStory.vue`, where `nGiven` is initialised to `1` and never
 * changed (`giveListHint`, which would increase it, is written but its only
 * call site is commented out). Per `CLAUDE.md`, the app is the source of
 * truth here. Pass this to `sentences.ts`'s `startingRows`, which already
 * implements "the target's first N rows given, the rest shuffled" for any
 * reorder item; there is nothing recap-specific left to build for that.
 */
export const RECAP_GIVEN = 1;

/**
 * The items of Luisteren > Verhaaltjes, in play order: the whole story, one
 * item per qualifying fragment (see `fragmentItems`), and the recap. Each is
 * tagged with its `PictureItemKind` so the game can choose a picture grid or
 * the reorder list without guessing from an item's shape. The difficulty on
 * every item here is a placeholder, exactly as in `fragmentItems`: `LevelRun`
 * stamps the section's starting difficulty over the first one.
 */
export function pictureItems(story: Story, stories: readonly Story[]): PictureItem[] {
	return [
		{ kind: 'story', item: wholeStoryItem(story, stories) },
		...fragmentItems(story, stories).map((item) => ({ kind: 'fragment' as const, item })),
		{ kind: 'recap', item: recapItem(story) }
	];
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

/**
 * Every story by key, for turning a whole-story option key back into the
 * story to show its overview illustration for. The recap's rows are fragment
 * keys, resolved through `fragmentIndex` instead; this is only for the
 * whole-story item.
 */
export const storyIndex = (stories: readonly Story[]): Map<string, Story> =>
	new Map(stories.map((story) => [story.key, story]));
