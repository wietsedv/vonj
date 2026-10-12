/**
 * The bundled content sets, one per language. These assertions guard the shape
 * the routes and the localStorage keys depend on, not the Gronings or the
 * Achterhoeks itself. Every assertion runs on both languages, because both have
 * to fit the same games.
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
	languageLevels,
	levelId,
	loadStory,
	sectionLevels,
	sounds,
	storyKeys
} from '$lib/content';
import { languages } from '$lib/languages';
import type { Category, Language } from '$lib/types';
import { describe, expect, it } from 'vitest';

const CATEGORY_ORDER: Category[] = ['luisteren', 'lezen', 'schrijven', 'spreken'];

const LANGUAGES = languages.map(({ id }) => id);

describe.each(LANGUAGES)('%s', (language: Language) => {
	const categorySet = categories(language);
	const soundSet = sounds(language);
	const distractorSet = distractorSounds(language);
	const stories = storyKeys(language);

	describe('categories', () => {
		it('holds the four categories, in overview order', () => {
			expect(categorySet.map((category) => category.id)).toEqual(CATEGORY_ORDER);
		});

		it('names and describes every category', () => {
			for (const category of categorySet) {
				expect(category.name).toBeTruthy();
				expect(category.description).toBeTruthy();
			}
		});

		it('looks a category up by id', () => {
			expect(getCategory(language, 'schrijven')?.name).toBe('Schrijven');
		});

		it('has no category outside the Category type', () => {
			expect(getCategory(language, 'listen' as Category)).toBeUndefined();
		});
	});

	describe('sections', () => {
		it('gives every section a Dutch id, a name and a description', () => {
			for (const category of categorySet) {
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
			for (const category of categorySet) {
				const ids = category.sections.map((section) => section.id);
				expect(new Set(ids).size).toBe(ids.length);
			}
		});

		it('looks a section up by category and id', () => {
			expect(getSection(language, 'luisteren', 'woorden-tijdslimiet')?.name).toBe(
				'Woorden met tijdslimiet'
			);
		});

		it('has nothing under an unknown section', () => {
			expect(getSection(language, 'luisteren', 'zinnen')).toBeUndefined();
			expect(sectionLevels(language, 'luisteren', 'zinnen')).toEqual([]);
		});
	});

	describe('levels', () => {
		it('builds a level id out of language, category, section and story', () => {
			expect(levelId(language, 'luisteren', 'woorden', stories[0])).toBe(
				`${language}.luisteren.woorden.${stories[0]}`
			);
		});

		it('gives four levels per section', () => {
			for (const category of categorySet) {
				for (const section of category.sections) {
					expect(sectionLevels(language, category.id, section.id)).toHaveLength(4);
				}
			}
		});

		it('counts 12, 12, 8 and 12 levels per category', () => {
			expect(CATEGORY_ORDER.map((id) => categoryLevels(language, id).length)).toEqual([
				12, 12, 8, 12
			]);
		});

		it('counts 44 levels in total', () => {
			expect(languageLevels(language)).toHaveLength(44);
		});

		it('plays every section on the same four stories', () => {
			expect(stories).toHaveLength(4);
			for (const level of languageLevels(language)) {
				expect(level.language).toBe(language);
				expect(level.story).toBe(stories[level.number - 1]);
			}
		});

		it('numbers the levels of a section 1 upwards', () => {
			for (const category of categorySet) {
				for (const section of category.sections) {
					const levels = sectionLevels(language, category.id, section.id);
					expect(levels.map((level) => level.number)).toEqual([1, 2, 3, 4]);
				}
			}
		});

		it('gives every level a unique id, which is also its localStorage key', () => {
			const ids = languageLevels(language).map((level) => level.id);
			expect(new Set(ids).size).toBe(ids.length);
			for (const level of languageLevels(language)) {
				expect(level.id).toBe(`${language}.${level.category}.${level.section}.${level.story}`);
			}
		});

		it('uses one Dutch vocabulary in every id', () => {
			// The original app's English ids live only inside the build script.
			const english = /\b(listen|read|write|speak|words|sentences|stories|timed)\b/;
			for (const level of languageLevels(language)) {
				expect(level.id).toMatch(/^[a-z0-9._-]+$/);
				expect(level.id).not.toMatch(english);
			}
		});
	});

	describe('sounds', () => {
		it('gives every sound a spelling, and a recording unless the original had none', () => {
			expect(soundSet.length).toBeGreaterThan(0);
			for (const sound of soundSet) {
				expect(sound.sound).toBeTruthy();
				expect(sound.audio === undefined || sound.audio.length > 0).toBe(true);
			}
			const silent = soundSet.filter((sound) => sound.audio === undefined).map((s) => s.sound);
			// The Achterhoeks branch lists "oa" but never committed its recording.
			expect(silent).toEqual(language === 'achterhoeks' ? ['oa'] : []);
		});

		it('spells every sound exactly once', () => {
			expect(new Set(soundSet.map((sound) => sound.sound)).size).toBe(soundSet.length);
		});

		it('offers every sound as a distractor unless it opts out', () => {
			expect(distractorSet.length).toBeGreaterThan(0);
			expect(distractorSet.length).toBeLessThanOrEqual(soundSet.length);
			for (const sound of soundSet) {
				expect(distractorSet.includes(sound)).toBe(sound.distractor !== false);
			}
			// The original never offers G!, in either language.
			expect(soundSet.filter((sound) => sound.distractor === false).map((s) => s.sound)).toEqual([
				'G!'
			]);
		});

		it('looks a sound up by its spelling', () => {
			expect(getSound(language, soundSet[0].sound)).toBe(soundSet[0]);
			expect(getSound(language, 'niet-een-klank')).toBeUndefined();
		});
	});

	describe('stories', () => {
		it('is not holding a story before one is asked for', () => {
			expect(getLoadedStory(language, 'niet-een-verhaal')).toBeUndefined();
		});

		it('loads every story a level points at', async () => {
			for (const key of stories) {
				const story = await loadStory(language, key);
				expect(story.key).toBe(key);
				expect(story.audio).toBeTruthy();
				expect(story.image).toBeTruthy();
				expect(story.fragments.length).toBeGreaterThan(0);
			}
		});

		it('returns the same story object on a second load', async () => {
			const first = await loadStory(language, stories[0]);
			expect(await loadStory(language, stories[0])).toBe(first);
			expect(getLoadedStory(language, stories[0])).toBe(first);
		});

		it('refuses a story that is not in the content set', async () => {
			await expect(loadStory(language, 'niet-een-verhaal')).rejects.toThrow(/niet-een-verhaal/);
		});

		it('gives every fragment an illustration and at least one sentence', async () => {
			for (const key of stories) {
				const story = await loadStory(language, key);
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
			for (const key of stories) {
				const story = await loadStory(language, key);
				for (const fragment of story.fragments) {
					for (const sentence of fragment.sentences) {
						for (const word of sentence.words) {
							expect(word.text).toBeTruthy();
							expect(word.audio).toBeTruthy();
							// A few words carry no translation in the original app's data
							// (four of 653 in Gronings, two of 484 in Achterhoeks), which is
							// the truth here. Never an empty string.
							expect(word.dutch === null || word.dutch.length > 0).toBe(true);
							expect(word.sounds.length).toBeGreaterThan(0);
							for (const sound of word.sounds) {
								expect(getSound(language, sound), `${word.text} uses "${sound}"`).toBeDefined();
							}
						}
					}
				}
			}
		});
	});
});

describe('languages', () => {
	it('has a content set for every language', () => {
		expect(LANGUAGES).toEqual(['gronings', 'achterhoeks']);
		expect(allLevels()).toHaveLength(44 * LANGUAGES.length);
	});

	it('shares the categories and sections, but not the stories', () => {
		const shape = (language: Language) =>
			categories(language).map((category) => [
				category.id,
				category.name,
				category.sections.map((section) => [section.id, section.name])
			]);
		expect(shape('achterhoeks')).toEqual(shape('gronings'));

		const gronings = new Set(storyKeys('gronings'));
		expect(storyKeys('achterhoeks').some((key) => gronings.has(key))).toBe(false);
	});

	it('names the language being taught in the copy of each', () => {
		expect(getCategory('gronings', 'lezen')?.description).toContain('Gronings');
		expect(getCategory('achterhoeks', 'lezen')?.description).toContain('Achterhooks');
	});

	it('keeps the levels of one language apart from the other in localStorage', () => {
		const ids = allLevels().map((level) => level.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('does not find a story of one language in the other', async () => {
		await expect(loadStory('achterhoeks', 'bragel')).rejects.toThrow(/bragel/);
		await expect(loadStory('gronings', storyKeys('achterhoeks')[0])).rejects.toThrow();
	});
});
