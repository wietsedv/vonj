/**
 * The tappable sound field, in a browser: the shared display used at the top
 * of a SoundColumns column and, unadorned, for the sounds shown on the
 * feedback card ("De juiste uitspraak is:"). See the "Per-item feedback card"
 * section of `docs/original-app/level-shell.md`.
 */
import SoundField from '$lib/components/level/SoundField.svelte';
import { distractorSounds } from '$lib/content';
import { flushSync } from 'svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const sound = distractorSounds[0].sound;

beforeAll(async () => {
	await page.viewport(400, 800);
});

it('shows the given sound', async () => {
	const { container } = await render(SoundField, { sound, label: 'test', onclick: vi.fn() });
	expect(container.querySelector('button')!.textContent!.trim()).toBe(sound);
});

it('shows nothing, and cannot be tapped, when there is no sound', async () => {
	const onclick = vi.fn();
	const { container } = await render(SoundField, { sound: null, label: 'test', onclick });
	const button = container.querySelector('button')! as HTMLButtonElement;
	expect(button.textContent!.trim()).toBe('');
	expect(button.disabled).toBe(true);
	flushSync(() => button.click());
	expect(onclick).not.toHaveBeenCalled();
});

it('calls onclick, with no argument, when tapped', async () => {
	const onclick = vi.fn();
	const { container } = await render(SoundField, { sound, label: 'test', onclick });
	flushSync(() => container.querySelector('button')!.click());
	expect(onclick).toHaveBeenCalledExactlyOnceWith();
});

it('carries the given accessible label', async () => {
	const { container } = await render(SoundField, {
		sound,
		label: 'Klank "aa" opnieuw afspelen',
		onclick: vi.fn()
	});
	expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
		'Klank "aa" opnieuw afspelen'
	);
});

describe('without a result', () => {
	it('is uncoloured and shows no icon', async () => {
		const { container } = await render(SoundField, { sound, label: 'test', onclick: vi.fn() });
		expect(container.querySelector('svg')).toBeNull();
	});
});

describe('with a result', () => {
	it('shows a check mark for correct, not colour alone', async () => {
		const { container } = await render(SoundField, {
			sound,
			result: 'correct',
			label: 'test',
			onclick: vi.fn()
		});
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('shows a cross for wrong, not colour alone', async () => {
		const { container } = await render(SoundField, {
			sound,
			result: 'wrong',
			label: 'test',
			onclick: vi.fn()
		});
		expect(container.querySelector('svg')).not.toBeNull();
	});
});

describe('while sounding', () => {
	it('scales up', async () => {
		const { container } = await render(SoundField, {
			sound,
			sounding: true,
			label: 'test',
			onclick: vi.fn()
		});
		// Tailwind 4's `scale-*` utilities set the native CSS `scale` property
		// directly rather than composing into `transform`.
		const scale = getComputedStyle(container.querySelector('button')!).scale;
		expect(scale).not.toBe('none');
	});
});
