/**
 * The bundled content set. These assertions guard the shape the routes and the
 * localStorage keys depend on, not the Gronings itself.
 */
import {
	allLevels,
	categories,
	categoryLevels,
	distractorSounds,
	getCategory,
	getLoadedStory,
	getSection,
	getSound,
	levelId,
	loadStory,
	sectionLevels,
	sounds
} from '$lib/content';
import type { Category } from '$lib/types';
import { describe, expect, it } from 'vitest';

const CATEGORY_ORDER: Category[] = ['luisteren', 'lezen', 'schrijven', 'spreken'];

/** Every story the content set puts behind a level. */
const storyKeys = [...new Set(allLevels().map((level) => level.story))];

describe('categories', () => {
	it('holds the four categories, in overview order', () => {
		expect(categories.map((category) => category.id)).toEqual(CATEGORY_ORDER);
	});

	it('names and describes every category', () => {
		for (const category of categories) {
			expect(category.name).toBeTruthy();
			expect(category.description).toBeTruthy();
		}
	});

	it('looks a category up by id', () => {
		expect(getCategory('schrijven')?.name).toBe('Schrijven');
	});

	it('has no category outside the Category type', () => {
		expect(getCategory('listen' as Category)).toBeUndefined();
	});
});

describe('sections', () => {
	it('gives every section a Dutch id, a name and a description', () => {
		for (const category of categories) {
			expect(category.sections.length).toBeGreaterThan(0);
			for (const section of category.sections) {
				expect(section.id).toMatch(/^[a-z0-9-]+$/);
				expect(section.name).toBeTruthy();
				expect(section.description.length).toBeGreaterThan(0);
				expect(section.description.length).toBeLessThanOrEqual(2);
			}
		}
	});

	it('keeps section ids unique within their category', () => {
		for (const category of categories) {
			const ids = category.sections.map((section) => section.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it('looks a section up by category and id', () => {
		expect(getSection('luisteren', 'woorden-tijdslimiet')?.name).toBe('Woorden met tijdslimiet');
	});

	it('has nothing under an unknown section', () => {
		expect(getSection('luisteren', 'zinnen')).toBeUndefined();
		expect(sectionLevels('luisteren', 'zinnen')).toEqual([]);
	});
});

describe('levels', () => {
	it('builds a level id out of category, section and story', () => {
		expect(levelId('luisteren', 'woorden', 'bragel')).toBe('luisteren.woorden.bragel');
	});

	it('gives four levels per section', () => {
		for (const category of categories) {
			for (const section of category.sections) {
				expect(sectionLevels(category.id, section.id)).toHaveLength(4);
			}
		}
	});

	it('counts 12, 12, 8 and 12 levels per category', () => {
		expect(CATEGORY_ORDER.map((id) => categoryLevels(id).length)).toEqual([12, 12, 8, 12]);
	});

	it('counts 44 levels in total', () => {
		expect(allLevels()).toHaveLength(44);
	});

	it('numbers the levels of a section 1 upwards', () => {
		for (const category of categories) {
			for (const section of category.sections) {
				const levels = sectionLevels(category.id, section.id);
				expect(levels.map((level) => level.number)).toEqual([1, 2, 3, 4]);
			}
		}
	});

	it('gives every level a unique id, which is also its localStorage key', () => {
		const ids = allLevels().map((level) => level.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const level of allLevels()) {
			expect(level.id).toBe(`${level.category}.${level.section}.${level.story}`);
		}
	});

	it('uses one Dutch vocabulary in every id', () => {
		// The original app's English ids live only inside the build script.
		const english = /\b(listen|read|write|speak|words|sentences|stories|timed)\b/;
		for (const level of allLevels()) {
			expect(level.id).toMatch(/^[a-z0-9.-]+$/);
			expect(level.id).not.toMatch(english);
		}
	});
});

describe('sounds', () => {
	it('gives every sound a spelling and a recording', () => {
		expect(sounds.length).toBeGreaterThan(0);
		for (const sound of sounds) {
			expect(sound.sound).toBeTruthy();
			expect(sound.audio).toBeTruthy();
		}
	});

	it('spells every sound exactly once', () => {
		expect(new Set(sounds.map((sound) => sound.sound)).size).toBe(sounds.length);
	});

	it('offers every sound as a distractor unless it opts out', () => {
		expect(distractorSounds.length).toBeGreaterThan(0);
		expect(distractorSounds.length).toBeLessThanOrEqual(sounds.length);
		for (const sound of sounds) {
			expect(distractorSounds.includes(sound)).toBe(sound.distractor !== false);
		}
	});

	it('looks a sound up by its spelling', () => {
		expect(getSound(sounds[0].sound)).toBe(sounds[0]);
		expect(getSound('niet-een-klank')).toBeUndefined();
	});
});

describe('stories', () => {
	it('is not holding a story before one is asked for', () => {
		expect(getLoadedStory('niet-een-verhaal')).toBeUndefined();
	});

	it('loads every story a level points at', async () => {
		for (const key of storyKeys) {
			const story = await loadStory(key);
			expect(story.key).toBe(key);
			expect(story.audio).toBeTruthy();
			expect(story.image).toBeTruthy();
			expect(story.fragments.length).toBeGreaterThan(0);
		}
	});

	it('returns the same story object on a second load', async () => {
		const first = await loadStory(storyKeys[0]);
		expect(await loadStory(storyKeys[0])).toBe(first);
		expect(getLoadedStory(storyKeys[0])).toBe(first);
	});

	it('refuses a story that is not in the content set', async () => {
		await expect(loadStory('niet-een-verhaal')).rejects.toThrow(/niet-een-verhaal/);
	});

	it('gives every fragment an illustration and at least one sentence', async () => {
		for (const key of storyKeys) {
			const story = await loadStory(key);
			for (const fragment of story.fragments) {
				expect(fragment.image).toBeTruthy();
				expect(fragment.time).toHaveLength(2);
				expect(fragment.time[0]).toBeLessThan(fragment.time[1]);
				expect(fragment.sentences.length).toBeGreaterThan(0);
				for (const sentence of fragment.sentences) {
					expect(sentence.text).toBeTruthy();
					expect(sentence.words.length).toBeGreaterThan(0);
				}
			}
		}
	});

	it('builds every word out of sounds that are in the inventory', async () => {
		// The sound games pick distractors from this inventory, so a word whose
		// sounds are not in it could never be answered.
		for (const key of storyKeys) {
			const story = await loadStory(key);
			for (const fragment of story.fragments) {
				for (const sentence of fragment.sentences) {
					for (const word of sentence.words) {
						expect(word.text).toBeTruthy();
						expect(word.audio).toBeTruthy();
						// Four of the 653 words carry no translation in the original
						// app's data, which is the truth here. Never an empty string.
						expect(word.dutch === null || word.dutch.length > 0).toBe(true);
						expect(word.sounds.length).toBeGreaterThan(0);
						for (const sound of word.sounds) {
							expect(getSound(sound), `${word.text} uses "${sound}"`).toBeDefined();
						}
					}
				}
			}
		}
	});
});
