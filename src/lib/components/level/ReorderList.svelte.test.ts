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
	const { container, rerender } = await render(ReorderList, { onreorder, onsubmit, ...options });
	return { container, rerender, onreorder, onsubmit, items: [...container.querySelectorAll('li')] };
};

const handle = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Sleephandvat"]');
const up = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Naar boven"]');
const down = (item: Element) =>
	item.querySelector<HTMLButtonElement>('button[aria-label="Naar beneden"]');
/** The row's marker slot: the `aria-hidden` element that is not the drag
 * handle, so it never matches the up/down buttons' own arrow icons. */
const marker = (item: Element) =>
	[...item.querySelectorAll('[aria-hidden="true"]')].find((el) => el !== handle(item)) ?? null;

/**
 * The `translateY` a row is currently given, from the inline style rather than
 * the computed one: a row making room is transitioning towards it, so the
 * computed value is only somewhere on the way there.
 */
const offsetOf = (item: Element): number => {
	const match = /translateY\((-?[\d.]+)px\)/.exec((item as HTMLElement).style.transform);
	return match ? Number(match[1]) : 0;
};

/** Presses the pointer on a row's handle and moves it to `clientY`. */
const dragTo = (item: Element, clientY: number, pointerId = 1) => {
	const rect = item.getBoundingClientRect();
	flushSync(() =>
		handle(item)!.dispatchEvent(
			new PointerEvent('pointerdown', {
				pointerId,
				clientX: rect.left + 10,
				clientY: rect.top + rect.height / 2,
				bubbles: true,
				cancelable: true
			})
		)
	);
	flushSync(() =>
		window.dispatchEvent(
			new PointerEvent('pointermove', {
				pointerId,
				clientX: rect.left + 10,
				clientY,
				bubbles: true,
				cancelable: true
			})
		)
	);
};

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

describe('the drag handle', () => {
	// It only listens for a pointer, so Enter and Space did nothing on it while
	// it sat in the tab order between every pair of rows. The up and down
	// buttons are the keyboard way to move a row. See TODO.md, "Accessibility".
	it('is out of the tab order and out of the accessibility tree', async () => {
		const { items } = await list({ rows: textRows(2) });
		expect(handle(items[0])!.tabIndex).toBe(-1);
		expect(handle(items[0])!.getAttribute('aria-hidden')).toBe('true');
	});

	it('still starts a drag, which is what it is for', async () => {
		const rows = textRows(3);
		const { items, onreorder } = await list({ rows });
		const target = items[0].getBoundingClientRect();
		flushSync(() =>
			handle(items[0])!.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientY: target.top })
			)
		);
		flushSync(() =>
			window.dispatchEvent(
				new PointerEvent('pointermove', {
					bubbles: true,
					pointerId: 1,
					clientY: target.top + target.height * 1.5
				})
			)
		);
		flushSync(() =>
			window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
		);
		expect(onreorder).toHaveBeenCalledExactlyOnceWith([rows[1].key, rows[0].key, rows[2].key]);
	});
});

describe('the instruction, on the buttons', () => {
	it('mentions the arrows as well as the handle', async () => {
		const instruction = 'Gebruik de streepjes om de items naar de juiste volgorde te verslepen.';
		const { container } = await list({ rows: textRows(2), instruction });
		expect(container.textContent).toContain('pijltjes');
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

	// The page behind the list is `--color-secondary`, so a secondary button sat
	// on its own colour. Every "Versturen" in the app is `--color-accent`.
	it('is the accent green, not the colour of the page it sits on', async () => {
		const { container } = await list({ rows: textRows(2) });
		const button = [...container.querySelectorAll('button')].find(
			(candidate) => candidate.textContent!.trim() === 'Versturen'
		)!;
		expect(getComputedStyle(button).backgroundColor).toBe('rgb(15, 178, 21)');
	});
});

describe('while a row is being dragged', () => {
	// The drop is only committed on pointerup, but the list must already look
	// like the order it would produce, so the gap the row will fall into is
	// visible before the finger lifts.
	it('moves the rows it has passed into the places the drop would give them', async () => {
		const rows = textRows(4);
		const { items, onreorder } = await list({ rows });
		const tops = items.map((item) => item.getBoundingClientRect().top);
		const height = items[0].getBoundingClientRect().height;

		// Just past the third row's centre: the first row would land in slot 2.
		dragTo(items[0], tops[2] + height / 2 + 5);

		// The two rows it passed each moved up by exactly one slot...
		expect(offsetOf(items[1])).toBeCloseTo(tops[0] - tops[1], 1);
		expect(offsetOf(items[2])).toBeCloseTo(tops[1] - tops[2], 1);
		// ...the row it never reached stayed put...
		expect(offsetOf(items[3])).toBe(0);
		// ...and nothing was reported to the caller yet.
		expect(onreorder).not.toHaveBeenCalled();
	});

	it('follows the pointer with the dragged row, without a transition on it', async () => {
		const rows = textRows(3);
		const { items } = await list({ rows });
		const start = items[0].getBoundingClientRect();

		dragTo(items[0], start.top + start.height / 2 + 40);

		expect(offsetOf(items[0])).toBeCloseTo(40, 1);
		expect((items[0] as HTMLElement).style.transition).toBe('');
		// A row making room does transition, so it slides rather than jumps.
		expect((items[1] as HTMLElement).style.transition).toContain('transform');
	});

	it('puts the rows back when the gesture is cancelled', async () => {
		const rows = textRows(3);
		const { items, onreorder } = await list({ rows });
		const second = items[1].getBoundingClientRect();

		dragTo(items[0], second.top + second.height / 2 + 5);
		expect(offsetOf(items[1])).not.toBe(0);

		flushSync(() =>
			window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }))
		);
		expect(offsetOf(items[0])).toBe(0);
		expect(offsetOf(items[1])).toBe(0);
		expect(onreorder).not.toHaveBeenCalled();
	});

	it('leaves a locked row where it is, and jumps over it', async () => {
		const rows = textRows(3);
		const { items, onreorder } = await list({ rows, locked: [rows[1].key] });
		const tops = items.map((item) => item.getBoundingClientRect().top);
		const height = items[0].getBoundingClientRect().height;

		// rows[0] and rows[2] are the movable pair, with the locked row between them.
		dragTo(items[0], tops[2] + height / 2 + 5);

		expect(offsetOf(items[1])).toBe(0);
		expect(offsetOf(items[2])).toBeCloseTo(tops[0] - tops[2], 1);

		flushSync(() =>
			window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
		);
		expect(onreorder).toHaveBeenCalledExactlyOnceWith([rows[2].key, rows[1].key, rows[0].key]);
	});
});

describe('the move animation', () => {
	// The caller owns the order, so a move is only visible once it hands back the
	// reordered rows; the rows then slide to their new places instead of jumping.
	it('slides a row that changed place, and leaves the untouched rows alone', async () => {
		const rows = textRows(3);
		const { items, rerender } = await list({ rows });
		const [first, second, third] = items;

		flushSync(() => down(first)!.click());
		await rerender({ rows: [rows[1], rows[0], rows[2]] });

		// Both swapped rows are mid-flight, displaced from where they now sit.
		for (const item of [first, second]) {
			expect(item.getAnimations()).not.toHaveLength(0);
			expect(getComputedStyle(item).transform).not.toBe('none');
		}
		expect(third.getAnimations()).toHaveLength(0);
	});

	// A dragged row is placed by its own transform, which must follow the pointer
	// exactly: the shadow is the only thing on it that may transition.
	it('does not transition the transform of a row', async () => {
		const { items } = await list({ rows: textRows(2) });
		expect(getComputedStyle(items[0]).transitionProperty).toBe('box-shadow');
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
