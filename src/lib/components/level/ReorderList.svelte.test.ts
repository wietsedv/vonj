/**
 * The drag-and-drop list, in a browser: row order, the up/down buttons, the
 * locked-row and marker rules, and a real pointer drag. See
 * `docs/original-app/games.md`, "Drag-and-drop list".
 */
import ReorderList, {
	type ReorderRow,
	type RowMarker
} from '$lib/components/level/ReorderList.svelte';
import { loadStory } from '$lib/content';
import { imageUrl } from '$lib/content/assets';
import Arrow from '$lib/icons/arrow.svelte';
import Check from '$lib/icons/check.svelte';
import type { Story } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

let story: Story;
let checkPath: string;
let arrowPath: string;

/** Four short, distinct text rows, in the order given. */
const textRows = (count = 4): ReorderRow[] =>
	['Een', 'Twee', 'Drie', 'Vier'].slice(0, count).map((text, index) => ({
		key: `row-${index}`,
		text
	}));

/** Real illustrations, for the recap item's rows. */
const imageRows = (count = 3): ReorderRow[] =>
	story.fragments.slice(0, count).map((fragment) => ({
		key: fragment.key,
		image: imageUrl(fragment.image)
	}));

/** The concatenated `path` data of an icon, so two renders can be compared. */
const pathData = (svg: SVGElement): string =>
	[...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')).join('|');

interface Options {
	rows: ReorderRow[];
	locked?: string[];
	markers?: Record<string, RowMarker>;
	instruction?: string | null;
	submitLabel?: string;
	canSubmit?: boolean;
}

const list = async (options: Options) => {
	const onreorder = vi.fn();
	const onsubmit = vi.fn();
	const { container } = await render(ReorderList, { onreorder, onsubmit, ...options });
	return { container, onreorder, onsubmit, items: [...container.querySelectorAll('li')] };
};

const handle = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Sleephandvat"]');
const up = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Naar boven"]');
const down = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Naar beneden"]');
/** The row's marker slot: the only `aria-hidden` element, so it never matches
 * the up/down buttons' own arrow icons. */
const marker = (item: Element) => item.querySelector('[aria-hidden="true"]');

beforeAll(async () => {
	story = await loadStory('bragel');
	await page.viewport(400, 800);

	const checkRender = await render(Check);
	checkPath = pathData(checkRender.container.querySelector('svg')!);
	checkRender.unmount();

	const arrowRender = await render(Arrow);
	arrowPath = pathData(arrowRender.container.querySelector('svg')!);
	arrowRender.unmount();
});

describe('the rows', () => {
	it('shows one row per item, in the given order', async () => {
		const rows = textRows(4);
		const { items } = await list({ rows });
		expect(items).toHaveLength(4);
		expect(items.map((item) => item.querySelector('p')!.textContent!.trim())).toEqual([
			'Een',
			'Twee',
			'Drie',
			'Vier'
		]);
	});

	it('shows text rows as text', async () => {
		const { items } = await list({ rows: textRows(1) });
		expect(items[0].querySelector('p')!.textContent!.trim()).toBe('Een');
		expect(items[0].querySelector('img')).toBeNull();
	});

	it('shows image rows as illustrations', async () => {
		const rows = imageRows(3);
		const { items } = await list({ rows });
		for (const [index, item] of items.entries()) {
			expect(item.querySelector('img')!.getAttribute('src')).toBe(rows[index].image);
			expect(item.querySelector('p')).toBeNull();
		}
	});
});

describe('the instruction line', () => {
	it('is absent when no instruction is passed', async () => {
		const { container } = await list({ rows: textRows(2) });
		expect(container.textContent).not.toContain('streepjes');
	});

	it('shows the caller-supplied line when passed', async () => {
		const instruction = 'Gebruik de streepjes om de items naar de juiste volgorde te verslepen.';
		const { container } = await list({ rows: textRows(2), instruction });
		expect(container.textContent).toContain(instruction);
	});
});

describe('the up and down buttons', () => {
	it('reports the reordered keys when a row moves down', async () => {
		const rows = textRows(4);
		const { items, onreorder } = await list({ rows });
		flushSync(() => down(items[0])!.click());
		expect(onreorder).toHaveBeenCalledExactlyOnceWith([
			rows[1].key,
			rows[0].key,
			rows[2].key,
			rows[3].key
		]);
	});

	it('reports the reordered keys when a row moves up', async () => {
		const rows = textRows(4);
		const { items, onreorder } = await list({ rows });
		flushSync(() => up(items[2])!.click());
		expect(onreorder).toHaveBeenCalledExactlyOnceWith([
			rows[0].key,
			rows[2].key,
			rows[1].key,
			rows[3].key
		]);
	});

	it('disables "up" on the first row and "down" on the last', async () => {
		const rows = textRows(3);
		const { items, onreorder } = await list({ rows });
		expect(up(items[0])!.disabled).toBe(true);
		expect(down(items[2])!.disabled).toBe(true);
		expect(down(items[0])!.disabled).toBe(false);
		expect(up(items[2])!.disabled).toBe(false);

		flushSync(() => up(items[0])!.click());
		flushSync(() => down(items[2])!.click());
		expect(onreorder).not.toHaveBeenCalled();
	});

	it('treats the first and last MOVABLE row as the ends, not the list itself', async () => {
		const rows = textRows(3);
		const { items } = await list({ rows, locked: [rows[0].key] });
		// rows[0] is locked, so rows[1] is the first movable row and rows[2] the last.
		expect(up(items[1])!.disabled).toBe(true);
		expect(down(items[2])!.disabled).toBe(true);
		expect(down(items[1])!.disabled).toBe(false);
	});
});

describe('a locked row', () => {
	it('has no drag handle and no up/down buttons', async () => {
		const rows = textRows(3);
		const { items } = await list({ rows, locked: [rows[1].key] });
		expect(handle(items[1])).toBeNull();
		expect(up(items[1])).toBeNull();
		expect(down(items[1])).toBeNull();
		// The other rows stay movable.
		expect(handle(items[0])).not.toBeNull();
		expect(handle(items[2])).not.toBeNull();
	});

	it('is always marked correct, with no markers passed at all', async () => {
		const rows = textRows(2);
		const { items } = await list({ rows, locked: [rows[0].key] });
		const svg = marker(items[0])!.querySelector('svg')!;
		expect(pathData(svg)).toBe(checkPath);
	});

	it("cannot be moved by clicking a neighbour's buttons past it", async () => {
		const rows = textRows(3);
		const { items, onreorder } = await list({ rows, locked: [rows[0].key] });
		// rows[1] is the first movable row; moving it up must not touch the locked row.
		flushSync(() => up(items[1])!.click());
		expect(onreorder).not.toHaveBeenCalled();
	});
});

describe('markers', () => {
	it('shows nothing when a row has no marker', async () => {
		const rows = textRows(1);
		const { items } = await list({ rows });
		expect(marker(items[0])!.querySelector('svg')).toBeNull();
	});

	it('shows a check mark for "correct"', async () => {
		const rows = textRows(1);
		const { items } = await list({ rows, markers: { [rows[0].key]: 'correct' } });
		expect(pathData(marker(items[0])!.querySelector('svg')!)).toBe(checkPath);
	});

	it('shows an upright arrow for "up" and a flipped one for "down"', async () => {
		const rows = textRows(2);
		const { items } = await list({
			rows,
			markers: { [rows[0].key]: 'up', [rows[1].key]: 'down' }
		});

		expect(pathData(marker(items[0])!.querySelector('svg')!)).toBe(arrowPath);
		expect(pathData(marker(items[1])!.querySelector('svg')!)).toBe(arrowPath);

		const upWrapper = marker(items[0])!.querySelector('svg')!.parentElement!;
		const downWrapper = marker(items[1])!.querySelector('svg')!.parentElement!;
		// Tailwind 4's `rotate-*` utilities set the native CSS `rotate` property
		// rather than composing into `transform`.
		expect(getComputedStyle(upWrapper).rotate).toBe('none');
		expect(getComputedStyle(downWrapper).rotate).toBe('180deg');
	});
});

describe('the submit button', () => {
	it('uses the default label and calls onsubmit', async () => {
		const { container, onsubmit } = await list({ rows: textRows(2) });
		const button = [...container.querySelectorAll('button')].find(
			(candidate) => candidate.textContent!.trim() === 'Versturen'
		)!;
		expect(button).toBeDefined();
		flushSync(() => button.click());
		expect(onsubmit).toHaveBeenCalledOnce();
	});

	it('uses a caller-supplied label', async () => {
		const { container } = await list({ rows: textRows(2), submitLabel: 'Volgende' });
		const labels = [...container.querySelectorAll('button')].map((b) => b.textContent!.trim());
		expect(labels).toContain('Volgende');
		expect(labels).not.toContain('Versturen');
	});

	it('is disabled when canSubmit is false', async () => {
		const { container } = await list({ rows: textRows(2), canSubmit: false });
		const button = [...container.querySelectorAll('button')].find(
			(candidate) => candidate.textContent!.trim() === 'Versturen'
		)!;
		expect(button.disabled).toBe(true);
	});
});

describe('a pointer drag', () => {
	it('reports the row dropped near the third row as moved there', async () => {
		const rows = textRows(4);
		const { items, onreorder } = await list({ rows });

		const rects = items.map((item) => item.getBoundingClientRect());
		const startX = rects[0].left + 10;
		const startY = rects[0].top + rects[0].height / 2;
		// Just past the third row's centre.
		const targetY = rects[2].top + rects[2].height / 2 + 5;

		const grip = handle(items[0])!;
		grip.dispatchEvent(
			new PointerEvent('pointerdown', {
				pointerId: 1,
				clientX: startX,
				clientY: startY,
				bubbles: true,
				cancelable: true
			})
		);
		flushSync();
		window.dispatchEvent(
			new PointerEvent('pointermove', {
				pointerId: 1,
				clientX: startX,
				clientY: targetY,
				bubbles: true,
				cancelable: true
			})
		);
		flushSync();
		window.dispatchEvent(
			new PointerEvent('pointerup', {
				pointerId: 1,
				clientX: startX,
				clientY: targetY,
				bubbles: true,
				cancelable: true
			})
		);
		flushSync();

		expect(onreorder).toHaveBeenCalledExactlyOnceWith([
			rows[1].key,
			rows[2].key,
			rows[0].key,
			rows[3].key
		]);
	});
});
