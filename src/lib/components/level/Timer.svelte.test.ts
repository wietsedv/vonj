/**
 * The timer card, in a browser: what it shows, the exact Dutch copy, and that
 * it survives a narrow viewport. See the "Timers" section of
 * `docs/original-app/games.md` and "Top area" in
 * `docs/original-app/level-shell.md`.
 */
import Timer from '$lib/components/level/Timer.svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

beforeAll(async () => {
	await page.viewport(400, 800);
});

describe('the timer card', () => {
	it('shows the total time left as mm:ss', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 42,
			secondsUntilHint: 7
		});
		expect(container.textContent).toContain('00:42');
	});

	it('shows "mm:ss tot volgende hint" for the time left in the current step', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 90,
			secondsUntilHint: 8
		});
		expect(container.textContent).toContain('00:08 tot volgende hint');
	});

	it('formats a total over a minute', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 90,
			secondsUntilHint: 8
		});
		expect(container.textContent).toContain('01:30');
	});

	it('says "Tijd is om!" once time is up', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 0,
			secondsUntilHint: 0,
			timeUp: true
		});
		expect(container.textContent).toContain('Tijd is om!');
	});

	it('drops the hint line once time is up', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 0,
			secondsUntilHint: 0,
			timeUp: true
		});
		expect(container.textContent).not.toContain('tot volgende hint');
	});
});

describe('what a screen reader hears', () => {
	// Reading every tick out would be unusable, so only the two moments that
	// matter are announced. See TODO.md, "Accessibility".
	it('announces nothing while there is still time', async () => {
		const { container } = await render(Timer, { totalSecondsLeft: 90, secondsUntilHint: 8 });
		const status = container.querySelector('[role="status"]')!;
		expect(status.textContent!.trim()).toBe('');
	});

	it('announces the last seconds before a hint, once', async () => {
		const { container } = await render(Timer, { totalSecondsLeft: 20, secondsUntilHint: 5 });
		expect(container.querySelector('[role="status"]')!.textContent).toContain('vijf seconden');
	});

	it('announces "Tijd is om!"', async () => {
		const { container } = await render(Timer, {
			totalSecondsLeft: 0,
			secondsUntilHint: 0,
			timeUp: true
		});
		expect(container.querySelector('[role="status"]')!.textContent).toContain('Tijd is om!');
	});
});

describe('reduced motion', () => {
	it('pulses only when motion is welcome', async () => {
		const { container } = await render(Timer, { totalSecondsLeft: 20, secondsUntilHint: 3 });
		const line = [...container.querySelectorAll('p')].find((p) =>
			p.textContent!.includes('tot volgende hint')
		)!;
		expect(line.className).toContain('motion-safe:animate-pulse');
		expect(line.className).not.toMatch(/(^|\s)animate-pulse/);
	});
});

describe('on a 320px phone', () => {
	it('stays inside the viewport, on its own', async () => {
		await page.viewport(320, 700);
		const { container } = await render(Timer, {
			totalSecondsLeft: 90,
			secondsUntilHint: 8
		});
		const card = container.firstElementChild as HTMLElement;
		expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
	});

	it('stays inside the viewport next to another element in a flex row', async () => {
		await page.viewport(320, 700);
		const { container } = await render(Timer, {
			totalSecondsLeft: 90,
			secondsUntilHint: 8
		});
		const card = container.firstElementChild as HTMLElement;

		const row = document.createElement('div');
		row.className = 'flex gap-3';
		const sibling = document.createElement('div');
		sibling.style.width = '4rem';
		sibling.style.flexShrink = '0';
		row.append(sibling);
		card.parentElement!.insertBefore(row, card);
		row.append(card);

		expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
	});
});
