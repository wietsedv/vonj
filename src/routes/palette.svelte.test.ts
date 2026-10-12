/**
 * The palettes, against the real stylesheet: each language takes the colours
 * of its own branch of the original, and the colour of a wrong answer is the
 * same red in both, because no branch changes it.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

/** The computed value of one CSS property of an element inside a palette. */
function colour(palette: string | null, className: string, property: 'backgroundColor' | 'fill') {
	const wrapper = document.createElement('div');
	if (palette) wrapper.dataset.palette = palette;
	const element = document.createElement('div');
	element.className = className;
	wrapper.append(element);
	document.body.append(wrapper);
	const value = getComputedStyle(element)[property];
	wrapper.remove();
	return value;
}

describe('the palettes', () => {
	it('gives Gronings its red header, blue page and green buttons', () => {
		expect(colour('gronings', 'bg-primary', 'backgroundColor')).toBe('rgb(227, 20, 20)');
		expect(colour('gronings', 'bg-secondary', 'backgroundColor')).toBe('rgb(0, 135, 210)');
		expect(colour('gronings', 'bg-accent', 'backgroundColor')).toBe('rgb(15, 178, 21)');
	});

	it('gives Achterhoeks the colours of the achterhoeks branch', () => {
		expect(colour('achterhoeks', 'bg-primary', 'backgroundColor')).toBe('rgb(24, 90, 32)');
		expect(colour('achterhoeks', 'bg-secondary', 'backgroundColor')).toBe('rgb(191, 179, 147)');
		expect(colour('achterhoeks', 'bg-accent', 'backgroundColor')).toBe('rgb(117, 196, 71)');
	});

	it('keeps a wrong answer red, and the tick green, in every language', () => {
		for (const palette of [null, 'gronings', 'achterhoeks']) {
			expect(colour(palette, 'bg-wrong', 'backgroundColor')).toBe('rgb(227, 20, 20)');
			expect(colour(palette, 'bg-check', 'backgroundColor')).toBe('rgb(15, 178, 21)');
		}
	});
});

describe('the page background', () => {
	it('follows the palette of the language a page belongs to', async () => {
		const layout = (await import('./[language=language]/+layout.svelte')).default;
		const { createRawSnippet } = await import('svelte');
		const children = createRawSnippet(() => ({ render: () => '<p>inhoud</p>' }));

		const achterhoeks = await render(layout, { data: { language: 'achterhoeks' }, children });
		expect(getComputedStyle(document.documentElement).backgroundColor).toBe('rgb(191, 179, 147)');
		achterhoeks.unmount();

		await render(layout, { data: { language: 'gronings' }, children });
		expect(getComputedStyle(document.documentElement).backgroundColor).toBe('rgb(0, 135, 210)');
	});

	it('stays plain on the language picker, which shows both', async () => {
		await render((await import('./+page.svelte')).default);
		expect(getComputedStyle(document.documentElement).backgroundColor).toBe('rgba(0, 0, 0, 0)');
	});
});
