/**
 * Resolves a URL to a level. The section id and the level number come straight
 * from the content, so `/luisteren/woorden/1` is the level whose stored progress
 * lives under `luisteren.woorden.bragel`.
 */
import { getSection, sectionLevels } from '$lib/content';
import type { Category } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	// The matcher has already checked that this is one of the four categories.
	const category = params.category as Category;

	const section = getSection(category, params.section);
	if (!section) error(404, `Onbekend onderdeel: ${params.section}`);

	const level = sectionLevels(category, section.id).find(
		(candidate) => String(candidate.number) === params.level
	);
	if (!level) error(404, `Onbekend level: ${params.level}`);

	return { category, section, level };
};
