/**
 * Which game a section is played with.
 *
 * A game is a component that builds its own `LevelRun` and renders its
 * interaction inside `LevelShell`; the level route only picks one. A section
 * that is missing here has no game yet and opens on the bare shell.
 */
import type { Category, Level, Section } from '$lib/types';
import type { Component } from 'svelte';
import LezenVerhaaltjes from './LezenVerhaaltjes.svelte';

/** What every game needs to play one level. */
export interface GameProps {
	category: Category;
	section: Section;
	level: Level;
}

/** Keyed as the rules table is, `<category>.<section>`. */
const games: Record<string, Component<GameProps>> = {
	'lezen.verhaaltjes': LezenVerhaaltjes
};

export const gameFor = (category: Category, section: string): Component<GameProps> | undefined =>
	games[`${category}.${section}`];
