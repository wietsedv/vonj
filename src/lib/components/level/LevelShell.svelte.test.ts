/**
 * The chrome every game shares, in a browser: the header, the progress dots,
 * the feedback card and the level result. See
 * `docs/original-app/level-shell.md`.
 *
 * `progress` cannot be reloaded per test in the browser project, so it is
 * loaded once and driven with `save()` and `resetEverything()`.
 */
import FeedbackCard from '$lib/components/level/FeedbackCard.svelte';
import LevelShell from '$lib/components/level/LevelShell.svelte';
import ProgressDots from '$lib/components/level/ProgressDots.svelte';
import { getSection, sectionLevels } from '$lib/content';
import { LevelRun } from '$lib/game/level.svelte';
import type { GameRules } from '$lib/game/rules';
import { progress } from '$lib/progress.svelte';
import type { DotState } from '$lib/game/level.svelte';
import type { Level, Section, StoredItem } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { learnIcons, stars } from '../../../tests/icons';

const level: Level = sectionLevels('luisteren', 'woorden')[0];
const section: Section = getSection('luisteren', 'woorden')!;

const rules: GameRules = {
	tolerance: 3,
	difficulty: { start: 0, min: 0, max: 2 },
	secondsPerStep: null,
	words: null
};

const items = (count: number): StoredItem[] =>
	Array.from({ length: count }, (_, index) => ({
		source: `item-${index}`,
		target: [`t${index}`],
		distractors: [['x']],
		responses: [],
		difficulty: 0
	}));

const runOf = (count = 4) => new LevelRun({ level, rules, generate: () => items(count) });

const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

const shell = async (props: Record<string, unknown>) =>
	(await render(LevelShell, { category: 'luisteren', section, ...props })).container;

const dots = (container: HTMLElement) => [...container.querySelectorAll('ol > li')];

beforeAll(async () => {
	localStorage.clear();
	await learnIcons();
	progress.load();
});

beforeEach(() => {
	progress.resetEverything();
});

describe('the header', () => {
	it('is the section name with its icon', async () => {
		const container = await shell({});
		expect(container.querySelector('h1')?.textContent?.trim()).toBe(section.name);
		expect(container.querySelector('header svg')).not.toBeNull();
	});

	it('shows both lines of the description, including the one the overview hides', async () => {
		const container = await shell({});
		for (const line of section.description) expect(text(container)).toContain(line);
	});

	it('has a labelled back button to the category overview', async () => {
		const container = await shell({});
		const back = container.querySelector('header a')!;
		expect(back.getAttribute('aria-label')).toBe('Terug naar het overzicht');
		expect(back.getAttribute('href')).toContain('luisteren');
	});
});

describe('the progress dots', () => {
	it('shows one numbered dot per item, so the length of the level is clear', async () => {
		const container = await shell({ run: runOf(9) });
		expect(dots(container).map(text)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
	});

	it('shows none at all until there is a run', async () => {
		expect(dots(await shell({}))).toHaveLength(0);
	});

	it('marks the item being played', async () => {
		const run = runOf();
		run.respond(['t0']);
		run.proceed();

		const container = await shell({ run });
		const current = dots(container).filter((dot) => dot.getAttribute('aria-current') === 'step');
		expect(current.map(text)).toEqual(['2']);
	});

	// docs/original-app/level-shell.md, "Progress dots".
	const STATES: DotState[] = ['correct', 'wrong', 'current', 'neutral'];

	it('gives every state a colour of its own', async () => {
		const { container } = await render(ProgressDots, { states: STATES });
		const colours = dots(container).map((dot) => getComputedStyle(dot).backgroundColor);
		expect(new Set(colours).size).toBe(STATES.length);
	});

	it('tells right from wrong with more than colour, by keeping the number', async () => {
		const { container } = await render(ProgressDots, { states: STATES });
		expect(dots(container).map(text)).toEqual(['1', '2', '3', '4']);
	});
});

describe('the feedback card', () => {
	it('is "Dat klopt!" with a green check mark for a correct answer', async () => {
		const { container } = await render(FeedbackCard, {
			title: 'Dat klopt!',
			tone: 'correct',
			description: 'Het juiste antwoord was:'
		});

		expect(text(container)).toContain('Dat klopt!');
		expect(text(container)).toContain('Het juiste antwoord was:');
		expect(getComputedStyle(container.querySelector('h2 span svg')!).fill).toBe('rgb(15, 178, 21)');
	});

	it('is "Jammer!" with a red cross when the clock ran out', async () => {
		const { container } = await render(FeedbackCard, { title: 'Jammer!', tone: 'wrong' });

		expect(text(container)).toContain('Jammer!');
		const icon = container.querySelector('h2 span svg')!;
		expect(getComputedStyle(icon).fill).toBe('rgb(227, 20, 20)');
	});

	it('shows no score, so an item is never mistaken for a result', async () => {
		const { container } = await render(FeedbackCard, { title: 'Dat klopt!', tone: 'correct' });
		expect(container.querySelectorAll('svg')).toHaveLength(1);
	});
});

describe('the level result', () => {
	/** A finished level, as reopening one from the overview gives. */
	const finished = (score: number) => {
		progress.save(level.id, { items: items(2), score });
		return runOf(2);
	};

	it('replaces the game with "Goed gedaan!" and the score in stars', async () => {
		const container = await shell({ run: finished(5) });

		expect(text(container)).toContain('Goed gedaan!');
		// docs/original-app/scoring.md: 5 out of 6 is two and a half stars.
		const score = container.querySelector('main div.flex.justify-center')!;
		expect(stars(score)).toBe('full full half');
	});

	it('hides the progress dots and the top area', async () => {
		const container = await shell({ run: finished(6) });
		expect(dots(container)).toHaveLength(0);
	});

	it('leads back to the category overview', async () => {
		const container = await shell({ run: finished(6) });
		const back = [...container.querySelectorAll('main a')].map(text);
		expect(back).toContain('Terug naar het overzicht');
	});

	it('offers a replay of a level that was already finished when it was opened', async () => {
		const container = await shell({ run: finished(2) });
		expect(text(container)).toContain('Dit level nog een keer spelen');
	});

	it('offers no replay of a level just played into its result', async () => {
		const run = runOf(1);
		run.respond(['t0']);
		run.proceed();

		const container = await shell({ run });
		expect(run.finished).toBe(true);
		expect(text(container)).not.toContain('Dit level nog een keer spelen');
	});

	it('shows the way on and the replay as clickable', async () => {
		const container = await shell({ run: finished(3) });
		for (const control of container.querySelectorAll('main a, main button')) {
			expect(getComputedStyle(control).cursor).toBe('pointer');
		}
	});

	it('starts the level over when the replay is tapped', async () => {
		const run = finished(2);
		const container = await shell({ run });

		const replay = [...container.querySelectorAll('button')].find(
			(button) => text(button) === 'Dit level nog een keer spelen'
		)!;
		flushSync(() => replay.click());

		expect(run.finished).toBe(false);
		expect(run.score).toBeNull();
		expect(text(container)).not.toContain('Goed gedaan!');
		expect(dots(container)).toHaveLength(2);
	});
});

describe('on a 320px phone', () => {
	beforeEach(async () => {
		await page.viewport(320, 700);
	});

	it('lays the shell out without sideways scrolling', async () => {
		await shell({ run: runOf(10) });
		const root = document.documentElement;
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
	});

	it('keeps ten progress dots inside the viewport', async () => {
		const container = await shell({ run: runOf(10) });
		for (const dot of dots(container)) {
			expect(dot.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		}
	});

	it('is styled, so these measurements mean something', async () => {
		const container = await shell({});
		const header = container.querySelector('header')!;
		// --color-primary from src/app.css.
		expect(getComputedStyle(header).backgroundColor).toBe('rgb(227, 20, 20)');
	});
});
