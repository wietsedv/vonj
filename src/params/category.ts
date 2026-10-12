/**
 * Keeps the level route to the real categories, so `/gronings/luisteren/
 * woorden/1` is a level and anything else is a 404 before the page is ever
 * rendered. The language segment is matched on its own, so this accepts a
 * category any language has; the routes check the pair.
 */
import { getCategory } from '$lib/content';
import { languages } from '$lib/languages';
import type { Category } from '$lib/types';
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) =>
	languages.some(({ id }) => getCategory(id, param as Category) !== undefined);
