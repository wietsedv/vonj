/**
 * Keeps the first URL segment to the languages the app has a content set for,
 * so `/gronings/...` and `/achterhoeks/...` exist and anything else is a 404.
 */
import { isLanguage } from '$lib/languages';
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => isLanguage(param);
