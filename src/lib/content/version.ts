/**
 * The version of the bundled content set.
 *
 * Stored levels hold generated items that point at fragments, words and sounds
 * by key. When content changes in a way that can invalidate those keys, bump
 * this number: every stored level is then discarded and regenerated. See
 * `docs/rewrite.md`.
 */
export const dataVersion = 1;
