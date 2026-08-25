/**
 * Which game a section is played with.
 *
 * A game is a component that builds its own `LevelRun` and renders its
 * interaction inside `LevelShell`; the level route only picks one.
 *
 * Every section of the content set has a game, and `games.test.ts` holds this
 * table to the rules table so that stays true: a new section has to arrive with
 * a game, or the test says which one is missing. The three Spreken sections
 * share one component, because they differ only in the rules their section id
 * already carries.
 */
import type { Category, Level, Section } from '$lib/types';
import type { Component } from 'svelte';
import LezenVerhaaltjes from './LezenVerhaaltjes.svelte';
import LezenZinnen from './LezenZinnen.svelte';
import LezenZinnenTijdslimiet from './LezenZinnenTijdslimiet.svelte';
import LuisterenVerhaaltjes from './LuisterenVerhaaltjes.svelte';
import LuisterenWoorden from './LuisterenWoorden.svelte';
import LuisterenWoordenTijdslimiet from './LuisterenWoordenTijdslimiet.svelte';
import SchrijvenWoorden from './SchrijvenWoorden.svelte';
import SchrijvenWoordenTijdslimiet from './SchrijvenWoordenTijdslimiet.svelte';
import SprekenWoorden from './SprekenWoorden.svelte';

/** What every game needs to play one level. */
export interface GameProps {
	category: Category;
	section: Section;
	level: Level;
}

/** Keyed as the rules table is, `<category>.<section>`. */
export const games = {
	'luisteren.verhaaltjes': LuisterenVerhaaltjes,
	'luisteren.woorden': LuisterenWoorden,
	'luisteren.woorden-tijdslimiet': LuisterenWoordenTijdslimiet,
	'lezen.verhaaltjes': LezenVerhaaltjes,
	'lezen.zinnen': LezenZinnen,
	'lezen.zinnen-tijdslimiet': LezenZinnenTijdslimiet,
	'schrijven.woorden': SchrijvenWoorden,
	'schrijven.woorden-tijdslimiet': SchrijvenWoordenTijdslimiet,
	'spreken.korte-woorden': SprekenWoorden,
	'spreken.normale-woorden': SprekenWoorden,
	'spreken.lange-woorden': SprekenWoorden
} satisfies Record<string, Component<GameProps>>;

export const gameFor = (category: Category, section: string): Component<GameProps> | undefined =>
	games[`${category}.${section}` as keyof typeof games];
