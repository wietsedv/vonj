/**
 * `AudioPlayer.svelte` in a browser: the four states and their icons, the
 * progress bar scaled to a `TimeRange`, the autoplay decision, and cleanup on
 * destroy. See the "Audio player" section of `docs/original-app/games.md` and
 * the autoplay/volume decisions in `docs/rewrite.md`.
 *
 * As in `$lib/game/audio.svelte.test.ts`, real playback here only starts
 * inside a real, Playwright-driven click - mounting the player is not a user
 * gesture. The one test for the autoplay-refused fallback mocks
 * `HTMLMediaElement.play` to reject instead of relying on that refusal
 * happening for real, because Chromium's autoplay policy is stateful per
 * origin: once this session's other tests have done enough real,
 * gesture-backed plays, Chromium starts allowing autoplay without a gesture
 * too. The mock keeps the fallback path itself deterministic regardless.
 */
import AudioPlayer, { type PlayerState } from '$lib/components/level/AudioPlayer.svelte';
import { getSound, loadStory } from '$lib/content';
import { soundUrl, storyUrl } from '$lib/content/assets';
import Ellipsis from '$lib/icons/ellipsis.svelte';
import Pause from '$lib/icons/pause.svelte';
import Play from '$lib/icons/play.svelte';
import Replay from '$lib/icons/replay.svelte';
import type { Story, TimeRange } from '$lib/types';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

let story: Story;
let fragmentRange: TimeRange;
let soundSrc: string;

/**
 * Icon components have no class or title to tell them apart, so - as in
 * `src/tests/icons.ts` for the score stars - each is rendered once and its
 * path data fingerprints it, rather than hardcoding any `d` attribute here.
 */
const fingerprints = new Map<string, PlayerState | 'loading'>();

async function learnIcons(): Promise<void> {
	const icons = [
		['loading', Ellipsis],
		['ready', Play],
		['playing', Pause],
		['finished', Replay]
	] as const;
	for (const [name, Icon] of icons) {
		const { container, unmount } = await render(Icon);
		const svg = container.querySelector('svg')!;
		const signature = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|');
		fingerprints.set(signature, name);
		await unmount();
	}
}

function iconOf(container: HTMLElement): string {
	const svg = container.querySelector('button svg')!;
	const signature = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|');
	return fingerprints.get(signature) ?? 'unrecognised';
}

/** A trusted, Playwright-driven click, the only kind Chromium's autoplay policy accepts. */
const click = (element: Element) => page.elementLocator(element).click();

/** The bar's fill, read off its inline `width` style rather than any test-only hook. */
function fillPercent(container: HTMLElement): number {
	const bar = container.querySelector<HTMLElement>('[style*="width"]')!;
	return parseFloat(bar.style.width);
}

beforeAll(async () => {
	await learnIcons();
	story = await loadStory('bragel');
	fragmentRange = story.fragments[0].time;
	soundSrc = soundUrl(getSound('a')!);
});

describe('the four states', () => {
	it('starts out loading, with the ellipsis icon and a matching label', async () => {
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: false });
		expect(iconOf(container)).toBe('loading');
		expect(container.querySelector('button')!.getAttribute('aria-label')).toMatch(/laden/i);
	});

	it('becomes ready, with the play icon, once loaded - without ever playing', async () => {
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: false });

		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));
		expect(container.querySelector('button')!.getAttribute('aria-label')).toMatch(/speel/i);
		expect(play).not.toHaveBeenCalled();
		play.mockRestore();
	});

	it('falls back to the ready state when an autoplay attempt is refused', async () => {
		// Simulates the browser refusing the unattended play() call the way it
		// would for a real, un-gestured autoplay attempt (confirmed by hand; see
		// the module doc comment for why the test does not rely on that refusal
		// happening for real). The ready state is exactly what absorbs it.
		const play = vi
			.spyOn(HTMLMediaElement.prototype, 'play')
			.mockRejectedValue(new DOMException('', 'NotAllowedError'));
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: true });
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'), { timeout: 5000 });
		play.mockRestore();
	});

	it('plays once tapped, showing the pause icon, given a real gesture', async () => {
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: false });
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));

		await click(container.querySelector('button')!);
		await vi.waitFor(() => expect(iconOf(container)).toBe('playing'), { timeout: 5000 });
		expect(container.querySelector('button')!.getAttribute('aria-label')).toMatch(/speelt af/i);
	});

	it('finishes with the replay icon, and can be replayed', async () => {
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: false });
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));

		await click(container.querySelector('button')!);
		await vi.waitFor(() => expect(iconOf(container)).toBe('finished'), { timeout: 5000 });
		expect(container.querySelector('button')!.getAttribute('aria-label')).toMatch(/opnieuw/i);

		await click(container.querySelector('button')!);
		await vi.waitFor(() => expect(iconOf(container)).toBe('playing'), { timeout: 5000 });
		await vi.waitFor(() => expect(iconOf(container)).toBe('finished'), { timeout: 5000 });
	});

	it('disables the button while loading or playing, not while ready or finished', async () => {
		const { container } = await render(AudioPlayer, { src: soundSrc, autoplay: false });
		const button = () => container.querySelector('button')!;

		expect(button().disabled).toBe(true); // loading
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));
		expect(button().disabled).toBe(false);

		await click(button());
		await vi.waitFor(() => expect(iconOf(container)).toBe('playing'));
		expect(button().disabled).toBe(true);

		await vi.waitFor(() => expect(iconOf(container)).toBe('finished'), { timeout: 5000 });
		expect(button().disabled).toBe(false);
	});
});

describe('the progress bar', () => {
	it('is scaled to the given range, not to the whole recording', async () => {
		const [start, end] = fragmentRange;
		const { container } = await render(AudioPlayer, {
			src: storyUrl(story),
			range: fragmentRange,
			autoplay: false
		});
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));
		await click(container.querySelector('button')!);
		await vi.waitFor(() => expect(iconOf(container)).toBe('playing'));

		// Half the fragment's own length in, well past what the equivalent point
		// in the whole ~40s recording would fill (a few percent). Scaled to the
		// range, the bar should be roughly half full.
		await new Promise((resolve) => setTimeout(resolve, ((end - start) * 1000) / 2));
		const midway = fillPercent(container);
		expect(midway).toBeGreaterThan(15);
		expect(midway).toBeLessThan(90);

		await vi.waitFor(() => expect(iconOf(container)).toBe('finished'), { timeout: 10000 });
		expect(fillPercent(container)).toBe(100);
	});
});

describe('cleanup', () => {
	it('leaves nothing playing once destroyed', async () => {
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');
		const { container, unmount } = await render(AudioPlayer, { src: soundSrc, autoplay: false });
		await vi.waitFor(() => expect(iconOf(container)).toBe('ready'));

		await click(container.querySelector('button')!);
		await vi.waitFor(() => expect(iconOf(container)).toBe('playing'));

		pause.mockClear();
		await unmount();
		expect(pause).toHaveBeenCalled();
		pause.mockRestore();
	});
});

describe('reporting state', () => {
	it('calls onstatechange with every state the player passes through', async () => {
		const seen: PlayerState[] = [];
		await render(AudioPlayer, {
			src: soundSrc,
			autoplay: false,
			onstatechange: (state: PlayerState) => seen.push(state)
		});
		await vi.waitFor(() => expect(seen).toContain('ready'));
		expect(seen[0]).toBe('loading');
	});
});
