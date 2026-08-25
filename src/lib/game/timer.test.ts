/**
 * The countdown of a timed section: per-step expiry, restarting for the next
 * step, the total remaining time, "Tijd is om!" only after the last step, and
 * that the clock is read from wall time rather than counted in ticks. See
 * `docs/original-app/games.md`, "Timers".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Countdown, formatSeconds } from './timer.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('a step running out', () => {
	it('starts with the full seconds of the step', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		expect(countdown.secondsLeft).toBe(15);
	});

	it('counts down while running', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(5000);
		expect(countdown.secondsLeft).toBe(10);
	});

	it('calls onexpire once the step reaches zero', () => {
		const onexpire = vi.fn();
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire });
		countdown.start();
		vi.advanceTimersByTime(15000);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	it('restarts the clock for the next step after an expiry', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000);
		expect(countdown.secondsLeft).toBe(15);
		expect(countdown.running).toBe(true);

		vi.advanceTimersByTime(4000);
		expect(countdown.secondsLeft).toBe(11);
	});

	it('keeps running across several expiries', () => {
		const onexpire = vi.fn();
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire });
		countdown.start();
		vi.advanceTimersByTime(15000 * 2);
		expect(onexpire).toHaveBeenCalledTimes(2);
		expect(countdown.running).toBe(true);
		expect(countdown.timeUp).toBe(false);
	});
});

describe('the total time for the whole item', () => {
	it('adds a full step for every step still to come', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		// The step in progress (15) plus two more full steps (15 + 15).
		expect(countdown.totalSecondsLeft).toBe(45);
	});

	it('shrinks as the current step ticks down', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(5000);
		expect(countdown.totalSecondsLeft).toBe(40);
	});

	it('drops by a full step on an expiry, not by the whole total', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000);
		// One step handed over: two full steps left (15 + 15).
		expect(countdown.totalSecondsLeft).toBe(30);
	});
});

describe('"Tijd is om!"', () => {
	it('is false while steps remain', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 2, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000);
		expect(countdown.timeUp).toBe(false);
	});

	it('becomes true only once the last step has been given away', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 2, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000 * 2);
		expect(countdown.timeUp).toBe(true);
	});

	it('stops the clock once time is up, with nothing left to count', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 1, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000);
		expect(countdown.running).toBe(false);
		expect(countdown.secondsLeft).toBe(0);
		expect(countdown.totalSecondsLeft).toBe(0);
	});

	it('is true from construction when there are no steps to give away', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 0, onexpire: vi.fn() });
		expect(countdown.timeUp).toBe(true);
	});
});

describe('setSteps', () => {
	it('shortens the total when the pupil fills a step in themselves', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		countdown.setSteps(1);
		// Only the step in progress left; no more full steps to add.
		expect(countdown.totalSecondsLeft).toBe(15);
	});

	it('leaves the step in progress ticking, unaffected by the new total', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(5000);
		countdown.setSteps(1);
		expect(countdown.secondsLeft).toBe(10);
	});

	it('stops the clock, without setting timeUp, once no steps are left', () => {
		const onexpire = vi.fn();
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire });
		countdown.start();
		countdown.setSteps(0);
		expect(countdown.running).toBe(false);
		expect(countdown.timeUp).toBe(false);
		expect(countdown.totalSecondsLeft).toBe(0);
		expect(onexpire).not.toHaveBeenCalled();
	});
});

describe('stop()', () => {
	it('freezes the clock immediately, as a correct answer does', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(5000);
		countdown.stop();
		const secondsLeft = countdown.secondsLeft;

		vi.advanceTimersByTime(20000);
		expect(countdown.secondsLeft).toBe(secondsLeft);
		expect(countdown.running).toBe(false);
	});

	it('is safe to call twice and leaves no interval behind', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		countdown.start();
		countdown.stop();
		expect(() => countdown.stop()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('is safe to call on a countdown that was never started', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 3, onexpire: vi.fn() });
		expect(() => countdown.stop()).not.toThrow();
	});

	it('leaves no interval behind once time is up on its own', () => {
		const countdown = new Countdown({ secondsPerStep: 15, steps: 1, onexpire: vi.fn() });
		countdown.start();
		vi.advanceTimersByTime(15000);
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('reading wall time rather than counting ticks', () => {
	// `Date.now` is stubbed directly, separately from the fake interval clock,
	// so the gap between calls does not depend on how many 1-second ticks the
	// fake timer engine believes have fired - exactly the situation a
	// throttled or backgrounded tab creates.

	it('catches up to the real time left after a tick is missed, instead of drifting', () => {
		const onexpire = vi.fn();
		const countdown = new Countdown({ secondsPerStep: 15, steps: 2, onexpire });
		const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		countdown.start(); // deadline: 1_015_000

		// 11 real seconds pass, but only one interval callback fires for it.
		// A "subtract one second per tick" implementation would report 14
		// seconds left; reading the deadline against the actual clock must
		// report the true 4.
		now.mockReturnValue(1_011_000);
		vi.advanceTimersByTime(1000);

		expect(countdown.secondsLeft).toBe(4);
		expect(onexpire).not.toHaveBeenCalled();
	});

	it('still expires the step exactly once when the gap overruns it', () => {
		const onexpire = vi.fn();
		const countdown = new Countdown({ secondsPerStep: 15, steps: 2, onexpire });
		const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		countdown.start();

		// A gap long enough to run out the current step entirely.
		now.mockReturnValue(1_020_000);
		vi.advanceTimersByTime(1000);

		expect(onexpire).toHaveBeenCalledTimes(1);
		// The next step starts fresh from the moment the expiry was noticed,
		// rather than inheriting the overshoot of the step it skipped past.
		expect(countdown.secondsLeft).toBe(15);
	});
});

describe('formatSeconds', () => {
	it('formats zero as "00:00"', () => {
		expect(formatSeconds(0)).toBe('00:00');
	});

	it('formats seconds under a minute', () => {
		expect(formatSeconds(45)).toBe('00:45');
	});

	it('formats a single-digit second with a leading zero', () => {
		expect(formatSeconds(5)).toBe('00:05');
	});

	it('formats over a minute', () => {
		expect(formatSeconds(90)).toBe('01:30');
	});

	it('formats several minutes', () => {
		expect(formatSeconds(725)).toBe('12:05');
	});
});
