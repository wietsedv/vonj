/**
 * The sound-column interface, in a browser: one column per sound, the
 * candidate stack, the display field, locked columns and the correct/wrong
 * marking after a submit. See `docs/original-app/games.md`, "Luisteren >
 * Woorden" and "Spreken > Korte, Normale en Lange woorden".
 */
import SoundColumns, { type SoundColumn } from '$lib/components/level/SoundColumns.svelte';
import { distractorSounds } from '$lib/content';
import { flushSync } from 'svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

/** Real sound spellings from the content set, never invented ones. */
const spellings = distractorSounds.map((sound) => sound.sound);

/** One column offering `count` real candidates, the first of which is "correct". */
function column(candidates: string[], overrides: Partial<SoundColumn> = {}): SoundColumn {
	return { candidates, chosen: null, ...overrides };
}

const columns = async (defs: SoundColumn[], extra: Record<string, unknown> = {}) => {
	const onselect = vi.fn();
	const onreplay = vi.fn();
	const { container } = await render(SoundColumns, {
		columns: defs,
		onselect,
		onreplay,
		...extra
	});
	const items = [...container.querySelectorAll('ol.flex.gap-3 > li')];
	return { container, items, onselect, onreplay };
};

/** The display field of one rendered column. */
const field = (item: Element) => item.querySelector('button')!;

/** The candidate buttons of one rendered column, top to bottom. */
const candidates = (item: Element) =>
	[...item.querySelectorAll('ol.flex-col > li > button')] as HTMLButtonElement[];

/** One computed colour as its four 0-255 channels, whatever notation it is in. */
function channels(colour: string): [number, number, number, number] {
	const context = document.createElement('canvas').getContext('2d')!;
	context.fillStyle = colour;
	context.fillRect(0, 0, 1, 1);
	const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
	return [red, green, blue, alpha];
}

/**
 * The uniform factor of a computed `scale`, or 1 when there is none. Tailwind
 * 4's `scale-*` utilities set the native CSS `scale` property directly rather
 * than composing into `transform` (see ReorderList.svelte.test.ts for the
 * same note about `rotate-*`).
 */
function scaleOf(scale: string): number {
	if (scale === 'none') return 1;
	const [x] = scale.split(' ').map(Number);
	return x;
}

beforeAll(async () => {
	await page.viewport(400, 800);
});

describe('the columns', () => {
	it('shows one column per sound', async () => {
		for (const count of [3, 7]) {
			const defs = Array.from({ length: count }, (_, i) => column(spellings.slice(i, i + 3)));
			expect((await columns(defs)).items).toHaveLength(count);
		}
	});

	it('renders the candidates of a column in the given order', async () => {
		for (const count of [2, 3, 4]) {
			const candidateSpellings = spellings.slice(0, count);
			const { items } = await columns([column(candidateSpellings)]);
			expect(candidates(items[0]).map((button) => button.textContent!.trim())).toEqual(
				candidateSpellings
			);
		}
	});

	it('shows the chosen sound in the display field, and nothing when none is chosen', async () => {
		const { items } = await columns([
			column(spellings.slice(0, 3), { chosen: spellings[0] }),
			column(spellings.slice(3, 6))
		]);
		expect(field(items[0]).textContent!.trim()).toBe(spellings[0]);
		expect(field(items[1]).textContent!.trim()).toBe('');
	});

	it('reports the column and sound of a tapped candidate', async () => {
		const candidateSpellings = spellings.slice(0, 3);
		const { items, onselect } = await columns([
			column(spellings.slice(10, 13)),
			column(candidateSpellings)
		]);
		flushSync(() => candidates(items[1])[2].click());
		expect(onselect).toHaveBeenCalledExactlyOnceWith(1, candidateSpellings[2]);
	});

	it('reports a replay when the display field is tapped', async () => {
		const { items, onreplay } = await columns([
			column(spellings.slice(0, 3), { chosen: spellings[0] })
		]);
		flushSync(() => field(items[0]).click());
		expect(onreplay).toHaveBeenCalledExactlyOnceWith(0);
	});

	it('does not let an empty display field be tapped', async () => {
		const { items, onreplay } = await columns([column(spellings.slice(0, 3))]);
		expect((field(items[0]) as HTMLButtonElement).disabled).toBe(true);
		flushSync(() => field(items[0]).click());
		expect(onreplay).not.toHaveBeenCalled();
	});
});

describe('the accessible grouping', () => {
	// Ten columns are otherwise one flat run of one-letter buttons, with nothing
	// tying a candidate to the position it fills. See TODO.md, "Accessibility".
	it('names every column, so a candidate has a column to belong to', async () => {
		const defs = Array.from({ length: 3 }, (_, i) => column(spellings.slice(i, i + 3)));
		const { items } = await columns(defs);
		expect(
			items.map((item) => item.querySelector('[role="group"]')!.getAttribute('aria-label'))
		).toEqual(['Klank 1 van 3', 'Klank 2 van 3', 'Klank 3 van 3']);
	});

	it('keeps the whole column inside its group, field and candidates alike', async () => {
		const { items } = await columns([column(spellings.slice(0, 3), { chosen: spellings[0] })]);
		const group = items[0].querySelector('[role="group"]')!;
		expect(group.contains(field(items[0]))).toBe(true);
		for (const candidate of candidates(items[0])) expect(group.contains(candidate)).toBe(true);
	});
});

describe('a locked column', () => {
	it('cannot have its candidates tapped', async () => {
		const candidateSpellings = spellings.slice(0, 3);
		const { items, onselect } = await columns([
			column(candidateSpellings, { chosen: candidateSpellings[1], locked: true })
		]);
		for (const button of candidates(items[0]))
			expect((button as HTMLButtonElement).disabled).toBe(true);
		flushSync(() => candidates(items[0])[0].click());
		expect(onselect).not.toHaveBeenCalled();
	});

	it('is marked correct even without a result', async () => {
		const candidateSpellings = spellings.slice(0, 3);
		const { items } = await columns([
			column(candidateSpellings, { chosen: candidateSpellings[1], locked: true })
		]);
		expect(field(items[0]).textContent!.trim()).toContain(candidateSpellings[1]);
		const style = getComputedStyle(field(items[0]));
		const [red, green, blue] = channels(style.backgroundColor);
		// --color-accent from src/app.css, tinted at low opacity: green dominates.
		expect(green).toBeGreaterThan(red);
		expect(green).toBeGreaterThan(blue);
		expect(field(items[0]).querySelector('svg')).not.toBeNull();
	});
});

describe('after a submit', () => {
	it('marks a correct column in green with a check mark, not colour alone', async () => {
		const candidateSpellings = spellings.slice(0, 3);
		const { items } = await columns([
			column(candidateSpellings, { chosen: candidateSpellings[0], result: 'correct' })
		]);
		const style = getComputedStyle(field(items[0]));
		const [red, green, blue] = channels(style.backgroundColor);
		// --color-accent from src/app.css, tinted at low opacity: green dominates.
		expect(green).toBeGreaterThan(red);
		expect(green).toBeGreaterThan(blue);
		expect(field(items[0]).querySelector('svg')).not.toBeNull();
	});

	it('marks a wrong column in red with a cross, not colour alone', async () => {
		const candidateSpellings = spellings.slice(0, 3);
		const { items } = await columns([
			column(candidateSpellings, { chosen: candidateSpellings[0], result: 'wrong' })
		]);
		const style = getComputedStyle(field(items[0]));
		const [red, green, blue] = channels(style.backgroundColor);
		// --color-primary from src/app.css, tinted at low opacity: red dominates.
		expect(red).toBeGreaterThan(green);
		expect(red).toBeGreaterThan(blue);
		expect(field(items[0]).querySelector('svg')).not.toBeNull();
	});
});

describe('the sounding sound', () => {
	it('scales up the display field of the sounding column, and no other', async () => {
		const { items } = await columns(
			[
				column(spellings.slice(0, 3), { chosen: spellings[0] }),
				column(spellings.slice(3, 6), { chosen: spellings[3] })
			],
			{ sounding: 1 }
		);
		expect(scaleOf(getComputedStyle(field(items[0])).scale)).toBeCloseTo(1, 1);
		expect(scaleOf(getComputedStyle(field(items[1])).scale)).toBeGreaterThan(1.1);
	});
});

describe('on a 320px phone', () => {
	it('scrolls ten columns horizontally without widening the page', async () => {
		await page.viewport(320, 700);
		const defs = Array.from({ length: 10 }, (_, i) => column(spellings.slice(i, i + 3)));
		const { container } = await columns(defs);
		const scroller = container.querySelector('div.overflow-x-auto')!;
		expect(scroller.scrollWidth).toBeGreaterThan(320);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
	});
});
