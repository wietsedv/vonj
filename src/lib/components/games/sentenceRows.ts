/**
 * Small pure helpers shared by `LezenZinnen.svelte` and
 * `LezenZinnenTijdslimiet.svelte`: turning a row order into what the
 * "Resultaat" card and `ReorderList` need to show. See `$lib/game/sentences.ts`
 * for how the rows themselves are generated and resolved.
 */
import type { ReorderRow } from '$lib/components/level/ReorderList.svelte';

/** The rows of a `ReorderList`, in `order`, with their text resolved. */
export function rowsFor(order: string[], index: Map<string, string>): ReorderRow[] {
	return order.map((key) => ({ key, text: index.get(key) ?? '' }));
}

/**
 * The current order as one line, chunks joined by " • ", for the "Resultaat"
 * card. See `docs/original-app/games.md`, "Lezen > Zinnen".
 */
export function resultText(order: string[], index: Map<string, string>): string {
	return order.map((key) => index.get(key) ?? '').join(' • ');
}
