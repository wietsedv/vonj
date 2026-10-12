/**
 * The media of the content set.
 *
 * Everything is imported through Vite, so the build fingerprints the files and
 * they can be cached forever. The maps hold URLs, not the media itself, so the
 * browser only fetches an illustration or a recording when something renders
 * it. `scripts/build-content.mjs` writes the files these globs pick up, one
 * directory per language, and an asset is looked up within its language: two
 * languages can well have a word, or a sound, with the same name.
 */
import type { Language, Sound, Story, Word } from '$lib/types';

/**
 * Reduces a glob result to a lookup by language and file name without its
 * extension: "./achterhoeks/assets/audio/words/zee.mp3" becomes "achterhoeks/zee".
 */
function byName(glob: Record<string, unknown>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [path, url] of Object.entries(glob)) {
		const language = path.split('/')[1];
		const name = path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
		map[`${language}/${name}`] = url as string;
	}
	return map;
}

const soundAudio = byName(
	import.meta.glob('./*/assets/audio/sounds/*.mp3', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);
const wordAudio = byName(
	import.meta.glob('./*/assets/audio/words/*.mp3', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);
const storyAudio = byName(
	import.meta.glob('./*/assets/audio/stories/*.mp3', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);
const stills = byName(
	import.meta.glob('./*/assets/images/*/*.webp', { eager: true, query: '?url', import: 'default' })
);
const animations = byName(
	import.meta.glob('./*/assets/animations/*/*.webp', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);

/**
 * A missing asset means the content set and the generated files disagree, which
 * is a build problem rather than something to render around.
 */
function lookup(map: Record<string, string>, language: Language, name: string, kind: string) {
	const url = map[`${language}/${name}`];
	if (!url)
		throw new Error(`No ${language} ${kind} asset named "${name}". Run scripts/build-content.mjs.`);
	return url;
}

/**
 * The recording of one sound, or null for a sound the original never had a
 * recording for (see `Sound.audio`), which plays as silence.
 */
export const soundUrl = (language: Language, sound: Sound): string | null =>
	sound.audio === undefined ? null : lookup(soundAudio, language, sound.audio, 'sound');

/** The recording of one word, spoken on its own. */
export const wordUrl = (language: Language, word: Word) =>
	lookup(wordAudio, language, word.audio, 'word');

/** The recording of a whole story, read aloud. */
export const storyUrl = (language: Language, story: Story) =>
	lookup(storyAudio, language, story.audio, 'story');

/** The still illustration of a story or one of its fragments. */
export const imageUrl = (language: Language, image: string) =>
	lookup(stills, language, image, 'image');

/** The animated illustration of a story or one of its fragments. */
export const animationUrl = (language: Language, image: string) =>
	lookup(animations, language, image, 'animation');
