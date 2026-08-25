/**
 * `$lib/game/audio` on real recordings, in a browser.
 *
 * This is a plain module, not a component, but it needs `HTMLAudioElement`
 * playback and, for the autoplay tests, a real user gesture, neither of which
 * exist in the `server` project. Hence the `.svelte.test.ts` suffix, which is
 * what routes a file into the browser project (see `vitest.config.ts`) even
 * though nothing here renders anything.
 *
 * Two things about Chromium's autoplay policy were confirmed by hand while
 * writing these tests: a `playClip` call made directly from test code, with
 * no user gesture behind it, is refused; one made from inside a real,
 * Playwright-driven click handler is a genuine gesture and succeeds. The
 * tests that need a real play use that click. The tests that need a refusal
 * mock `HTMLMediaElement.play` instead of relying on the refusal itself,
 * because Chromium's policy is stateful per origin: once enough real,
 * gesture-backed plays have happened (exactly what the "given a real gesture"
 * tests below do, repeatedly, in this same browser session), Chromium starts
 * allowing autoplay without a gesture too, which would make an unmocked
 * "refused" assertion pass or fail depending on what else ran earlier in the
 * suite. The mock keeps the fallback path itself - what `AudioPlayer.svelte`
 * and `playClip` do once `play()` rejects - deterministic.
 */
import { getSound, loadStory } from '$lib/content';
import { soundUrl, storyUrl, wordUrl } from '$lib/content/assets';
import { playClip, playSequence, type PlaybackOutcome } from '$lib/game/audio';
import type { Story, TimeRange } from '$lib/types';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

let story: Story;
let fragmentRange: TimeRange;

/** URL of a single short sound recording, real audio from the content set. */
const soundClip = (spelling: string) => soundUrl(getSound(spelling)!);

/**
 * Dispatches a real, trusted click through Playwright, which is what makes
 * Chromium treat a `play()` call inside the handler as a user gesture.
 * `element.click()` from plain JS does not: it fires a click event, but never
 * sets the user-activation flag autoplay policy checks.
 */
async function click(element: Element): Promise<void> {
	await page.elementLocator(element).click();
}

/**
 * A detached button, clicked once and then discarded. Playwright's click
 * requires a genuinely visible target, so it is given real text and size
 * rather than staying an empty, effectively invisible element.
 */
async function clickToRun(action: () => void): Promise<void> {
	const button = document.createElement('button');
	button.textContent = 'go';
	button.style.cssText = 'position:fixed;top:0;left:0;width:80px;height:40px;';
	document.body.appendChild(button);
	button.onclick = action;
	try {
		await click(button);
	} finally {
		button.remove();
	}
}

beforeAll(async () => {
	story = await loadStory('bragel');
	// A real fragment: a few seconds inside a recording of the whole story,
	// which runs far longer than that.
	fragmentRange = story.fragments[0].time;
});

describe('playClip', () => {
	it('reports a refused play() as "blocked" rather than throwing', async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, 'play')
			.mockRejectedValue(new DOMException('', 'NotAllowedError'));
		try {
			await expect(playClip(soundClip('a')).done).resolves.toBe('blocked');
		} finally {
			play.mockRestore();
		}
	});

	it('plays to the end and resolves "finished", given a real gesture', async () => {
		let outcome: PlaybackOutcome | undefined;
		await clickToRun(() => {
			playClip(soundClip('a')).done.then((result) => (outcome = result));
		});
		await vi.waitFor(() => expect(outcome).toBe('finished'), { timeout: 5000 });
	});

	it('reports progress as a 0-1 fraction that reaches 1 at the end', async () => {
		const seen: number[] = [];
		let outcome: PlaybackOutcome | undefined;
		await clickToRun(() => {
			playClip(soundClip('a'), { onProgress: (fraction) => seen.push(fraction) }).done.then(
				(result) => (outcome = result)
			);
		});
		await vi.waitFor(() => expect(outcome).toBe('finished'), { timeout: 5000 });
		expect(seen.length).toBeGreaterThan(0);
		for (const fraction of seen) {
			expect(fraction).toBeGreaterThanOrEqual(0);
			expect(fraction).toBeLessThanOrEqual(1);
		}
		expect(seen.at(-1)).toBe(1);
	});

	it('stops at the end of a range instead of running to the end of the file', async () => {
		const [start, end] = fragmentRange;
		let outcome: PlaybackOutcome | undefined;
		const startedAt = performance.now();
		await clickToRun(() => {
			playClip(storyUrl(story), { range: fragmentRange }).done.then((result) => {
				outcome = result;
			});
		});
		await vi.waitFor(() => expect(outcome).toBe('finished'), { timeout: 10000 });
		const elapsedSeconds = (performance.now() - startedAt) / 1000;

		// The range is a few seconds; the whole recording is closer to a minute.
		// Finishing near the range length instead of running far longer than it
		// is what proves playback stopped at `end`, not just anywhere past it.
		expect(elapsedSeconds).toBeGreaterThan(end - start - 1);
		expect(elapsedSeconds).toBeLessThan(end - start + 4);
	});

	it('never leaves the element playing once it settles, whatever the outcome', async () => {
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');
		pause.mockClear();

		await playClip(soundClip('a')).done; // whatever the outcome, finish() always pauses
		expect(pause).toHaveBeenCalled();

		pause.mockClear();
		const handle = playClip(soundClip('a'), { autoplay: false });
		handle.cancel();
		await handle.done;
		expect(pause).toHaveBeenCalled();

		pause.mockRestore();
	});

	describe('loaded with autoplay: false', () => {
		it('reports readiness without ever starting playback', async () => {
			const onStart = vi.fn();
			let ready = false;
			const handle = playClip(soundClip('a'), {
				autoplay: false,
				onReady: () => (ready = true),
				onStart
			});
			await vi.waitFor(() => expect(ready).toBe(true));

			// Nothing was ever started, so `done` has nothing to settle on; it is
			// still exactly as pending as a promise that will never resolve looks
			// from the outside.
			const pending = Symbol('pending');
			const raced = await Promise.race([
				handle.done,
				new Promise((resolve) => setTimeout(() => resolve(pending), 200))
			]);
			expect(raced).toBe(pending);
			expect(onStart).not.toHaveBeenCalled();

			handle.cancel();
			await expect(handle.done).resolves.toBe('cancelled');
		});
	});
});

describe('playSequence', () => {
	it('plays every clip in order, reporting each as it starts, then resolves "finished"', async () => {
		const word = story.fragments[0].sentences[0].words.find((w) => w.sounds.length >= 2)!;
		const urls = [...word.sounds.map(soundClip), wordUrl(word)];
		const items: number[] = [];
		let outcome: PlaybackOutcome | undefined;

		await clickToRun(() => {
			playSequence(urls, (index) => items.push(index)).done.then((result) => (outcome = result));
		});
		await vi.waitFor(() => expect(outcome).toBe('finished'), { timeout: 10000 });
		expect(items).toEqual(urls.map((_, index) => index));
	});

	it('cancelling partway stops it there and resolves "cancelled"', async () => {
		const urls = [soundClip('a'), soundClip('aa'), soundClip('aai')];
		const items: number[] = [];
		let outcome: PlaybackOutcome | undefined;
		let handle: ReturnType<typeof playSequence>;

		await clickToRun(() => {
			handle = playSequence(urls, (index) => items.push(index));
			handle.done.then((result) => (outcome = result));
		});
		await vi.waitFor(() => expect(items.length).toBeGreaterThan(0));
		handle!.cancel();

		await vi.waitFor(() => expect(outcome).toBe('cancelled'));
		expect(items.length).toBeLessThan(urls.length);
	});

	it('resolves "finished" straight away for an empty list', async () => {
		await expect(playSequence([]).done).resolves.toBe('finished');
	});
});
