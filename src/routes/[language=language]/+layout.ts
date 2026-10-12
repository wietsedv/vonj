/**
 * Every screen below `/gronings` or `/achterhoeks` belongs to that language. The
 * matcher has already checked that the segment is one of them.
 */
import type { Language } from '$lib/types';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => ({ language: params.language as Language });
