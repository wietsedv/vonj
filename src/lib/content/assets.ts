/**
 * The media of the content set.
 *
 * Everything is imported through Vite, so the build fingerprints the files and
 * they can be cached forever. The maps hold URLs, not the media itself, so the
 * browser only fetches an illustration or a recording when something renders
 * it. `scripts/build-content.mjs` writes the files these globs pick up.
 */
import type { Sound, Story, Word } from '$lib/types';

/** Reduces a glob result to a lookup by file name without its extension. */
function byName(glob: Record<string, unknown>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [path, url] of Object.entries(glob)) {
		map[path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))] = url as string;
	}
	return map;
}

const soundAudio = byName(
	import.meta.glob('./assets/audio/sounds/*.mp3', { eager: true, query: '?url', import: 'default' })
);
const wordAudio = byName(
	import.meta.glob('./assets/audio/words/*.mp3', { eager: true, query: '?url', import: 'default' })
);
const storyAudio = byName(
	import.meta.glob('./assets/audio/stories/*.mp3', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);
const stills = byName(
	import.meta.glob('./assets/images/*/*.webp', { eager: true, query: '?url', import: 'default' })
);
const animations = byName(
	import.meta.glob('./assets/animations/*/*.webp', {
		eager: true,
		query: '?url',
		import: 'default'
	})
);

/**
 * A missing asset means the content set and the generated files disagree, which
 * is a build problem rather than something to render around.
 */
function lookup(map: Record<string, string>, name: string, kind: string): string {
	const url = map[name];
	if (!url) throw new Error(`No ${kind} asset named "${name}". Run scripts/build-content.mjs.`);
	return url;
}

/** The recording of one Gronings sound. */
export const soundUrl = (sound: Sound) => lookup(soundAudio, sound.audio, 'sound');

/** The recording of one Gronings word, spoken on its own. */
export const wordUrl = (word: Word) => lookup(wordAudio, word.audio, 'word');

/** The recording of a whole story, read aloud. */
export const storyUrl = (story: Story) => lookup(storyAudio, story.audio, 'story');

/** The still illustration of a story or one of its fragments. */
export const imageUrl = (image: string) => lookup(stills, image, 'image');

/** The animated illustration of a story or one of its fragments. */
export const animationUrl = (image: string) => lookup(animations, image, 'animation');
