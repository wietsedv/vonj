/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

/** The four categories, in the order they appear on the global overview. */
export type Category = 'luisteren' | 'lezen' | 'schrijven' | 'spreken';

/** A start and an end offset in seconds inside a story recording. */
export type TimeRange = [start: number, end: number];

/** One Gronings word of a sentence, with everything the games need about it. */
export interface Word {
	key: string;
	/** The Gronings spelling, for example "noar". */
	text: string;
	/** The Dutch translation, for example "naar". */
	dutch: string;
	/** The sounds the word is built from, for example ["n", "o", "r"]. */
	sounds: string[];
	/** Name of the single-word recording in the asset set. */
	audio: string;
}

export interface Sentence {
	key: string;
	/** The full Gronings sentence. */
	text: string;
	/** Where the sentence sits in the story recording. */
	time: TimeRange;
	/**
	 * The words of the sentence that carry a translation and a recording. Not
	 * every word in `text` is listed.
	 */
	words: Word[];
}

/** One scene of a story: an illustration plus the sentences spoken over it. */
export interface Fragment {
	key: string;
	/** Where the fragment sits in the story recording. */
	time: TimeRange;
	/** Name of the illustration in the asset set. */
	image: string;
	sentences: Sentence[];
}

export interface Story {
	key: string;
	/** Name of the recording of the whole story in the asset set. */
	audio: string;
	/** Name of the overview illustration in the asset set. */
	image: string;
	fragments: Fragment[];
}

/** One of the roughly 43 sound units Gronings is written with. */
export interface Sound {
	/** The spelling of the sound, for example "aa" or "ng". */
	sound: string;
	/** Name of the recording in the asset set. */
	audio: string;
	/** False for sounds that are never offered as a distractor. Defaults to true. */
	distractor?: boolean;
}

export interface Section {
	/** Unique within its category, for example "woorden-tijdslimiet". */
	id: string;
	name: string;
	/**
	 * Up to two lines. The category overview shows the first line, the level
	 * itself shows both.
	 */
	description: string[];
	/** One level per story, in level order. */
	stories: string[];
}

export interface CategoryContent {
	id: Category;
	name: string;
	description: string;
	sections: Section[];
}

/** One playable level: a section played on one story. */
export interface Level {
	/** "luisteren.woorden.bragel", which is also its localStorage key. */
	id: string;
	category: Category;
	section: string;
	story: string;
	/** 1-based position in the section. Shown as "Level 1"; never names the story. */
	number: number;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * An answer is an ordered list of tokens, one per position the pupil fills in:
 * a single illustration key for the picture games, the chosen sounds or letters
 * for the word games, the submitted order for the reordering games.
 */
export type Answer = string[];

/**
 * One generated item of a level. Items are generated once and stored, so a
 * level replays identically and can be resumed part way through.
 */
export interface StoredItem {
	/** The story, fragment or word key this item was generated from. */
	source: string;
	/** The correct answer. */
	target: Answer;
	/** The wrong options offered, one list per position in the answer. */
	distractors: Answer[];
	/**
	 * Every response given, oldest first. Hints handed out by a timer count as
	 * responses, which is why running the clock down lowers the score.
	 */
	responses: Answer[];
	/** The difficulty this item was presented at. */
	difficulty: number;
}

export interface StoredLevel {
	items: StoredItem[];
	/** The 0-6 score, set when the last item is finished. Null until then. */
	score: number | null;
}

/** Progress over a set of levels: one section, one category, or everything. */
export interface ScopeProgress {
	/** How many levels the scope holds. */
	levels: number;
	/** How many of them are finished. */
	completed: number;
	/**
	 * The mean of the level scores, or null until every level is finished. Not
	 * rounded before it is turned into stars.
	 */
	score: number | null;
}
