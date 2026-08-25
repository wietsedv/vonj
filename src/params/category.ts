/**
 * Keeps the level route to the four real categories, so `/luisteren/woorden/1`
 * is a level and anything else is a 404 before the page is ever rendered.
 */
import { getCategory } from '$lib/content';
import type { Category } from '$lib/types';
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => getCategory(param as Category) !== undefined;
