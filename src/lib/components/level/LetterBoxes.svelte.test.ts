/**
 * The letter boxes, in a browser: typing, backspacing, locked boxes, the
 * per-position correct/wrong marking, and the read-only feedback-card mode.
 * See docs/original-app/games.md, "Schrijven > Woorden".
 */
import LetterBoxes, { type LetterResult } from '$lib/components/level/LetterBoxes.svelte';
import { flushSync } from 'svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

interface Options {
	letters: string[];
	locked?: boolean[];
	results?: LetterResult[];
	readonly?: boolean;
}

const boxes = async (options: Options) => {
	const onletter = vi.fn();
	const { container } = await render(LetterBoxes, { ...options, onletter });
	return {
		container,
		onletter,
		inputs: [...container.querySelectorAll('input')]
	};
};

/** Sets a box's value as typing (or an IME/paste) would, and fires the input event. */
const typeInto = (input: HTMLInputElement, value: string) => {
	flushSync(() => {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

/** Presses a key on a box, as a real keydown would. */
const press = (input: HTMLInputElement, key: string) => {
	flushSync(() => {
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	});
};

beforeAll(async () => {
	await page.viewport(400, 800);
});

describe('the boxes', () => {
	it('shows one box per letter', async () => {
		const { inputs } = await boxes({ letters: ['w', 'o', 'o', 'r', 'd'] });
		expect(inputs).toHaveLength(5);
	});

	it('shows the given letters', async () => {
		const { inputs } = await boxes({ letters: ['a', '', 'c'] });
		expect(inputs.map((input) => input.value)).toEqual(['a', '', 'c']);
	});

	it('turns autocorrect, autocapitalisation and spellcheck off', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b'] });
		for (const input of inputs) {
			expect(input.getAttribute('autocorrect')).toBe('off');
			expect(input.getAttribute('autocapitalize')).toBe('off');
			expect(input.getAttribute('spellcheck')).toBe('false');
			expect(input.getAttribute('autocomplete')).toBe('off');
		}
	});

	it('labels each box with its position in the word, in Dutch', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b', 'c'] });
		expect(inputs.map((input) => input.getAttribute('aria-label'))).toEqual([
			'Letter 1 van 3',
			'Letter 2 van 3',
			'Letter 3 van 3'
		]);
	});
});

describe('typing', () => {
	it('reports the typed letter and moves focus to the next box', async () => {
		const { inputs, onletter } = await boxes({ letters: ['', '', ''] });
		inputs[0].focus();
		typeInto(inputs[0], 'a');
		expect(onletter).toHaveBeenCalledExactlyOnceWith(0, 'a');
		expect(document.activeElement).toBe(inputs[1]);
	});

	it('does not move focus past the last box', async () => {
		const { inputs, onletter } = await boxes({ letters: ['', '', ''] });
		inputs[2].focus();
		typeInto(inputs[2], 'z');
		expect(onletter).toHaveBeenCalledExactlyOnceWith(2, 'z');
		expect(document.activeElement).toBe(inputs[2]);
	});

	it('takes only the first character of a pasted or composed value', async () => {
		const { inputs, onletter } = await boxes({ letters: ['', ''] });
		inputs[0].focus();
		typeInto(inputs[0], 'abc');
		expect(onletter).toHaveBeenCalledExactlyOnceWith(0, 'a');
		expect(inputs[0].value).toBe('a');
		// A whole word landing in one box still only advances by a single box.
		expect(document.activeElement).toBe(inputs[1]);
	});
});

// Driven with real events rather than a synthesised `input`, because the bug
// this covers was in what the browser does before `input` is ever dispatched.
describe('retyping a letter', () => {
	it('replaces the letter in a box that already has focus', async () => {
		const { inputs, onletter } = await boxes({ letters: ['a', 'b'] });
		await userEvent.click(inputs[1]);
		expect(document.activeElement).toBe(inputs[1]);

		// Clicking a box that already has focus fires no focus event, so nothing
		// selects the letter that is there; the keystroke used to land after it
		// and be swallowed without an `input` event at all.
		await userEvent.click(inputs[1]);
		await userEvent.keyboard('c');

		expect(onletter).toHaveBeenLastCalledWith(1, 'c');
		expect(inputs[1].value).toBe('c');
	});

	it('replaces the letter in the last box, where typing a word leaves focus', async () => {
		const { inputs, onletter } = await boxes({ letters: ['', ''] });
		await userEvent.click(inputs[0]);
		await userEvent.keyboard('ab');
		expect(document.activeElement).toBe(inputs[1]);

		await userEvent.keyboard('c');
		expect(onletter).toHaveBeenLastCalledWith(1, 'c');
		expect(inputs[1].value).toBe('c');
	});

	it('still advances to the next box when a letter is typed', async () => {
		const { inputs } = await boxes({ letters: ['a', ''] });
		await userEvent.click(inputs[0]);
		await userEvent.keyboard('z');
		expect(inputs[0].value).toBe('z');
		expect(document.activeElement).toBe(inputs[1]);
	});
});

describe('the focus indicator', () => {
	it('rings the box that has focus, not just the input inside it', async () => {
		const { container, inputs } = await boxes({ letters: ['a', 'b'] });
		const wrappers = [...container.querySelectorAll('span.relative')];
		inputs[1].focus();
		expect(getComputedStyle(wrappers[1]).boxShadow).not.toBe('none');
		expect(getComputedStyle(wrappers[0]).boxShadow).toBe('none');
	});
});

describe('backspace', () => {
	it('on an empty box moves focus back without reporting a change', async () => {
		const { inputs, onletter } = await boxes({ letters: ['a', ''] });
		inputs[1].focus();
		press(inputs[1], 'Backspace');
		expect(onletter).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(inputs[0]);
	});

	it('on a filled box clears it without moving focus', async () => {
		const { inputs, onletter } = await boxes({ letters: ['a', 'b'] });
		inputs[1].focus();
		typeInto(inputs[1], '');
		expect(onletter).toHaveBeenCalledExactlyOnceWith(1, '');
		expect(document.activeElement).toBe(inputs[1]);
	});
});

describe('a locked box', () => {
	it('cannot be edited', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b'], locked: [true, false] });
		expect(inputs[0].readOnly).toBe(true);
		expect(inputs[1].readOnly).toBe(false);
	});

	it('is marked correct even with no results at all', async () => {
		const { container } = await boxes({ letters: ['a', 'b'], locked: [true, false] });
		const wrappers = [...container.querySelectorAll('span.relative')];
		expect(wrappers[0].className).toContain('border-accent');
		expect(wrappers[0].querySelector('svg')).not.toBeNull();
		expect(wrappers[1].className).not.toContain('border-accent');
	});

	it('is skipped when focus advances past it', async () => {
		const { inputs, onletter } = await boxes({
			letters: ['', 'x', ''],
			locked: [false, true, false]
		});
		inputs[0].focus();
		// The middle box is locked, so typing the first letter must jump straight
		// to the third box rather than land on the locked one.
		typeInto(inputs[0], 'a');
		expect(onletter).toHaveBeenCalledExactlyOnceWith(0, 'a');
		expect(document.activeElement).toBe(inputs[2]);
	});

	it('is skipped by backspace-on-empty moving focus back', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b', ''], locked: [true, true, false] });
		inputs[2].focus();
		press(inputs[2], 'Backspace');
		// The only earlier editable box is none: both 0 and 1 are locked, so focus stays put.
		expect(document.activeElement).toBe(inputs[2]);
	});
});

describe('the per-position result', () => {
	it('marks a correct box green with a check mark', async () => {
		const { container } = await boxes({ letters: ['a', 'b'], results: ['correct', 'wrong'] });
		const wrappers = [...container.querySelectorAll('span.relative')];
		expect(wrappers[0].className).toContain('border-accent');
		expect(wrappers[1].className).toContain('border-primary');
	});

	it('shows a check or a cross, so the result is never colour alone', async () => {
		const { container } = await boxes({ letters: ['a', 'b'], results: ['correct', 'wrong'] });
		const wrappers = [...container.querySelectorAll('span.relative')];
		expect(wrappers[0].querySelectorAll('svg')).toHaveLength(1);
		expect(wrappers[1].querySelectorAll('svg')).toHaveLength(1);
	});

	it('marks the input invalid when its result is wrong', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b'], results: ['correct', 'wrong'] });
		expect(inputs[0].getAttribute('aria-invalid')).toBe('false');
		expect(inputs[1].getAttribute('aria-invalid')).toBe('true');
	});

	it('leaves a box with no result neutral', async () => {
		const { container } = await boxes({ letters: ['a'], results: [null] });
		const wrapper = container.querySelector('span.relative')!;
		expect(wrapper.className).not.toContain('border-accent');
		expect(wrapper.className).not.toContain('border-primary');
		expect(wrapper.querySelector('svg')).toBeNull();
	});
});

describe('read-only mode', () => {
	it('cannot be edited, even for a box that would otherwise be free', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b'], readonly: true });
		expect(inputs.every((input) => input.readOnly)).toBe(true);
	});

	it('does not move focus when typed into', async () => {
		const { inputs, onletter } = await boxes({ letters: ['a', 'b'], readonly: true });
		inputs[0].focus();
		typeInto(inputs[0], 'z');
		expect(onletter).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(inputs[0]);
	});

	it('still shows the given letters', async () => {
		const { inputs } = await boxes({ letters: ['a', 'b'], readonly: true });
		expect(inputs.map((input) => input.value)).toEqual(['a', 'b']);
	});
});

describe('on a 320px phone', () => {
	it('keeps a fifteen-letter word inside the viewport without scrolling it sideways', async () => {
		await page.viewport(320, 700);
		const letters = 'nachtvlinderke'.split('').concat('n');
		expect(letters).toHaveLength(15);
		const { inputs } = await boxes({ letters });
		for (const input of inputs) {
			expect(input.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		}
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
	});
});
