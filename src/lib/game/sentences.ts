/**
 * The sentence-reordering games: the story is cut into chunks of Gronings
 * text, and the pupil drags them back into the right order. Lezen > Zinnen
 * and Lezen > Zinnen met tijdslimiet both play this; the timed variant is the
 * same item list, it just has no free head start and locks rows on the clock
 * instead. See `docs/original-app/games.md`, "Lezen > Zinnen" and the shared
 * "Items", "Adaptive difficulty" and "Drag-and-drop list" sections.
 */
import { shuffled } from '$lib/game/generate';
import type { Fragment, Sentence, Story, StoredItem } from '$lib/types';

/** Sentences are cut into chunks of this many words; the last chunk of a sentence may be shorter. */
const WORDS_PER_CHUNK = 3;

/**
 * The chunk-accumulation threshold: "chunks accumulate until there are more
 * than three, which then form one item." Applied twice while walking a
 * fragment's sentences in order:
 *
 * - mid-fragment, after finishing a sentence, more than this many pending
 *   chunks close the item that has accumulated so far;
 * - at the end of the fragment, a trailing remainder of exactly this many
 *   chunks still becomes its own final item (a remainder can never be more,
 *   since that would already have closed above); fewer than this is dropped.
 *
 * The docs don't spell out that last part; it matches
 * `../vonj-app/app/pages/LevelReadSentences.vue`'s `prepareReadSentenceItems`,
 * which this module otherwise follows exactly.
 */
const MIN_CHUNKS_TO_KEEP = 3;

/** One row of a reordering item: a stored key plus the text it resolves to. */
interface Row {
	key: string;
	text: string;
}

/** A sentence cut into chunks of `WORDS_PER_CHUNK` words, keyed by sentence key plus start index. */
function sentenceChunks(sentence: Sentence): Row[] {
	const words = sentence.text.trim().split(/\s+/).filter(Boolean);
	const rows: Row[] = [];
	for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
		rows.push({ key: `${sentence.key}-${i}`, text: words.slice(i, i + WORDS_PER_CHUNK).join(' ') });
	}
	return rows;
}

/**
 * One fragment's sentences, cut into chunks and grouped into the rows of one
 * or more items, in the order they are found. See `MIN_CHUNKS_TO_KEEP`.
 */
function fragmentChunkGroups(fragment: Fragment): Row[][] {
	const groups: Row[][] = [];
	let pending: Row[] = [];
	for (const sentence of fragment.sentences) {
		pending.push(...sentenceChunks(sentence));
		if (pending.length > MIN_CHUNKS_TO_KEEP) {
			groups.push(pending);
			pending = [];
		}
	}
	if (pending.length >= MIN_CHUNKS_TO_KEEP) groups.push(pending);
	return groups;
}

/** The whole-story row of a fragment: its full text (every sentence), keyed by the fragment. */
const fragmentRow = (fragment: Fragment): Row => ({
	key: fragment.key,
	text: fragment.sentences.map((sentence) => sentence.text).join(' ')
});

/** One item from a list of rows already in their correct order. */
function rowItem(source: string, rows: Row[]): StoredItem {
	const target = rows.map((row) => row.key);
	return {
		source,
		target,
		// The order the rows start shuffled in, generated once here and then
		// stored, so it does not move around between visits. See
		// `docs/rewrite.md`, "The order of the options is fixed per item".
		distractors: [shuffled(target)],
		responses: [],
		difficulty: 0
	};
}

/**
 * The items of a level, in play order: one item per group of chunks
 * accumulated from a fragment's sentences, fragment by fragment, and a final
 * item of the whole story, one row per fragment in story order. The
 * difficulty here is a placeholder; `LevelRun` stamps the section's starting
 * difficulty over it, exactly as `fragmentItems` in `pictures.ts` does.
 */
export function sentenceItems(story: Story): StoredItem[] {
	const items: StoredItem[] = [];
	for (const fragment of story.fragments) {
		for (const rows of fragmentChunkGroups(fragment)) {
			items.push(rowItem(fragment.key, rows));
		}
	}
	items.push(rowItem(story.key, story.fragments.map(fragmentRow)));
	return items;
}

/**
 * Every row key of a story resolved back to its text: a chunk's words for a
 * chunk item, a fragment's full text for the whole-story item. Computed from
 * the story rather than stored, exactly as `fragmentIndex()` does in
 * `pictures.ts`.
 */
export function rowIndex(story: Story): Map<string, string> {
	const index = new Map<string, string>();
	for (const fragment of story.fragments) {
		index.set(fragment.key, fragmentRow(fragment).text);
		for (const sentence of fragment.sentences) {
			for (const chunk of sentenceChunks(sentence)) index.set(chunk.key, chunk.text);
		}
	}
	return index;
}

/**
 * The free head start of the untimed variant: how many rows at the front of
 * the correct order are given and locked before the pupil starts, at a given
 * item difficulty. Difficulty ranges -1 to 1 (see `rules.ts`); giving more at
 * the low end and less at the high end is what makes it a head start rather
 * than a fixed hint. There is no free head start in the timed variant (see
 * `timedGivenCount`); it is a game choice, not baked into the item, which is
 * why this takes a difficulty rather than reading one off a `StoredItem`.
 *
 * Matches `1 - difficulty` in
 * `../vonj-app/app/pages/LevelReadSentences.vue`'s `nGiven` getter, clamped
 * so a difficulty outside -1..1 cannot go negative. Note this gives two rows
 * at difficulty -1, not one: `docs/original-app/games.md` simplifies this to
 * "the first chunk" for "difficulty 0 or below", which undersells -1. The app
 * is the source of truth here.
 */
export const freeHeadStart = (difficulty: number): number => Math.max(0, 1 - difficulty);

/**
 * How many rows the timed variant has locked in as a hint after `expiries`
 * timer expiries. The timed variant starts with nothing given (unlike the
 * untimed head start above) and each expiry locks the next row of the
 * correct order in place; "next" means the next one after however many are
 * already locked, so this is just the expiry count, capped at `rowCount` once
 * every row has been given away and the clock has nothing left to reveal.
 */
export const timedGivenCount = (expiries: number, rowCount: number): number =>
	Math.min(Math.max(expiries, 0), rowCount);

/**
 * The rows of an item in the order they are shown before the pupil touches
 * anything: the stored starting shuffle, with the first `given` rows of the
 * correct order (the free head start or the timer's locked rows) pulled to
 * the top, in their correct order, exactly where they show up locked. The
 * rest keep the shuffle's relative order.
 */
export function startingRows(item: StoredItem, given: number): string[] {
	const clamped = Math.min(Math.max(given, 0), item.target.length);
	const givenKeys = item.target.slice(0, clamped);
	const rest = (item.distractors[0] ?? []).filter((key) => !givenKeys.includes(key));
	return [...givenKeys, ...rest];
}

/** Whether a row has to move, and which way, for the drag-and-drop list's per-row markers. */
export type RowMarker = 'correct' | 'up' | 'down';

/**
 * Per row, whether a submitted order has it in the right place or which way
 * it has to move to get there: `'down'` if it currently sits above its target
 * position, `'up'` if it sits below it. Matches `evaluateList` in
 * `../vonj-app/app/pages/LevelReadSentences.vue`. A row given as a free head
 * start or locked by the timer is always submitted in its correct position
 * already, so it comes back `'correct'` here without any special casing.
 */
export function rowMarkers(item: StoredItem, submitted: string[]): Record<string, RowMarker> {
	const markers: Record<string, RowMarker> = {};
	for (const key of submitted) {
		const targetIndex = item.target.indexOf(key);
		const currentIndex = submitted.indexOf(key);
		markers[key] =
			currentIndex === targetIndex ? 'correct' : currentIndex < targetIndex ? 'down' : 'up';
	}
	return markers;
}

/**
 * The correct text of an item, in order, for the feedback card's "Het juiste
 * verhaaltje was:" line.
 */
export const targetText = (item: StoredItem, index: Map<string, string>): string[] =>
	item.target.map((key) => index.get(key) ?? '');
