/**
 * The picture grid, in a browser: the two columns, the locked card and the
 * "Helaas!" overlay. See `docs/original-app/games.md`.
 */
import PictureGrid from '$lib/components/level/PictureGrid.svelte';
import { loadStory } from '$lib/content';
import { imageUrl } from '$lib/content/assets';
import type { Story } from '$lib/types';
import { flushSync } from 'svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

let story: Story;

/** As many real illustrations as a grid ever shows. */
const options = (count: number) =>
	story.fragments.slice(0, count).map((fragment) => ({
		key: fragment.key,
		image: imageUrl(fragment.image)
	}));

const grid = async (count: number, wrong: string[] = []) => {
	const onselect = vi.fn();
	const { container } = await render(PictureGrid, { options: options(count), wrong, onselect });
	return { cards: [...container.querySelectorAll('button')], container, onselect };
};

/** One computed colour as its four 0-255 channels, whatever notation it is in. */
function channels(colour: string): [number, number, number, number] {
	const context = document.createElement('canvas').getContext('2d')!;
	context.fillStyle = colour;
	context.fillRect(0, 0, 1, 1);
	const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
	return [red, green, blue, alpha];
}

beforeAll(async () => {
	story = await loadStory('bragel');
	await page.viewport(400, 800);
});

describe('the accessible name of a card', () => {
	// The cards hold nothing but a decorative illustration, so without this all
	// four to six of them announce as "button". See TODO.md, "Accessibility".
	it('numbers every card without saying what is on it', async () => {
		const { cards } = await grid(4);
		expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
			'Plaatje 1 van 4',
			'Plaatje 2 van 4',
			'Plaatje 3 van 4',
			'Plaatje 4 van 4'
		]);
	});

	it('says a locked card was the wrong one', async () => {
		const picked = options(4)[1].key;
		const { cards } = await grid(4, [picked]);
		expect(cards[1].getAttribute('aria-label')).toBe('Plaatje 2 van 4, helaas, fout');
		expect(cards[0].getAttribute('aria-label')).toBe('Plaatje 1 van 4');
	});
});

describe('the grid', () => {
	it('shows one card per option', async () => {
		for (const count of [4, 5, 6]) expect((await grid(count)).cards).toHaveLength(count);
	});

	it('shows an illustration on every card', async () => {
		const { cards } = await grid(6);
		for (const [index, card] of cards.entries()) {
			expect(card.querySelector('img')!.getAttribute('src')).toBe(options(6)[index].image);
		}
	});

	it('lays the cards out in two columns', async () => {
		const { cards } = await grid(6);
		const lefts = cards.map((card) => Math.round(card.getBoundingClientRect().left));
		expect(new Set(lefts).size).toBe(2);
		expect(new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size).toBe(3);
	});

	it('shows a card is clickable', async () => {
		const { cards } = await grid(4);
		for (const card of cards) expect(getComputedStyle(card).cursor).toBe('pointer');
	});

	it('reports the key of a tapped card', async () => {
		const { cards, onselect } = await grid(4);
		flushSync(() => cards[2].click());
		expect(onselect).toHaveBeenCalledExactlyOnceWith(options(4)[2].key);
	});
});

describe('a card that was wrong', () => {
	it('says "Helaas!" over the picture it was tapped on', async () => {
		const { cards } = await grid(4, [story.fragments[1].key]);
		expect(cards.map((card) => card.textContent!.trim())).toEqual(['', 'Helaas!', '', '']);
		expect(cards[1].querySelector('img')).not.toBeNull();
	});

	it('overlays it in red, and lets the picture show through', async () => {
		const { cards } = await grid(4, [story.fragments[1].key]);
		const overlay = getComputedStyle(cards[1].querySelector('span')!);

		// Tailwind mixes an opacity modifier in oklab, so the computed value is not
		// an rgba() string. A canvas converts it back to channels to assert on.
		const [red, green, blue, alpha] = channels(overlay.backgroundColor);
		// --color-primary from src/app.css, at half opacity.
		expect(red).toBeCloseTo(227, -1);
		expect(green).toBeCloseTo(20, -1);
		expect(blue).toBeCloseTo(20, -1);
		expect(alpha / 255).toBeCloseTo(0.5, 1);
		expect(overlay.color).toBe('rgb(255, 255, 255)');
	});

	it('cannot be tapped again', async () => {
		const { cards, onselect } = await grid(4, [story.fragments[1].key]);
		expect((cards[1] as HTMLButtonElement).disabled).toBe(true);
		flushSync(() => cards[1].click());
		expect(onselect).not.toHaveBeenCalled();
	});

	it('does not look clickable any more', async () => {
		const { cards } = await grid(4, [story.fragments[1].key]);
		expect(getComputedStyle(cards[1]).cursor).not.toBe('pointer');
	});
});

describe('on a 320px phone', () => {
	it('keeps six cards inside the viewport', async () => {
		await page.viewport(320, 700);
		const { cards } = await grid(6);
		for (const card of cards) {
			expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		}
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
	});
});
