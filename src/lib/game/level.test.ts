/**
 * The item loop: generating a level once, resuming it, recording responses,
 * carrying difficulty forward, and finishing on a score.
 *
 * `progress` is a module singleton with a one-shot `load()`, so every test takes
 * a fresh copy of the module and of the run that uses it.
 */
import { sectionLevels } from '$lib/content';
import type { GameRules } from '$lib/game/rules';
import type { Level, StoredItem } from '$lib/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

class FakeStorage {
	values = new Map<string, string>();
	getItem = (key: string): string | null => this.values.get(key) ?? null;
	setItem = (key: string, value: string): void => void this.values.set(key, String(value));
	removeItem = (key: string): void => void this.values.delete(key);
}

let fake: FakeStorage;

const level: Level = sectionLevels('luisteren', 'woorden')[0];

const rules: GameRules = {
	tolerance: 3,
	difficulty: { start: 0, min: 0, max: 2 },
	secondsPerStep: null,
	words: null
};

/** Three items whose answers are "a", "b" and "c". */
const three = (): StoredItem[] =>
	['a', 'b', 'c'].map((token) => ({
		source: token,
		target: [token],
		distractors: [['x', 'y']],
		responses: [],
		difficulty: 0
	}));

type Modules = {
	LevelRun: (typeof import('$lib/game/level.svelte'))['LevelRun'];
	progress: (typeof import('$lib/progress.svelte'))['progress'];
};

async function modules(): Promise<Modules> {
	vi.resetModules();
	const [{ LevelRun }, { progress }] = await Promise.all([
		import('$lib/game/level.svelte'),
		import('$lib/progress.svelte')
	]);
	return { LevelRun, progress };
}

/** A run over three items, on whatever is already in localStorage. */
async function run(overrides: Partial<GameRules> = {}) {
	const { LevelRun, progress } = await modules();
	const generate = vi.fn(three);
	const active = new LevelRun({ level, rules: { ...rules, ...overrides }, generate });
	return { run: active, progress, generate };
}

/** Puts a part-played level straight into localStorage, as an earlier visit did. */
function stored(items: StoredItem[], score: number | null = null) {
	fake.values.set('dataVersion', JSON.stringify(1));
	fake.values.set(level.id, JSON.stringify({ items, score }));
}

beforeEach(() => {
	fake = new FakeStorage();
	vi.stubGlobal('localStorage', fake);
});

describe('opening a level for the first time', () => {
	it('generates its items and stores them straight away', async () => {
		const { run: active, generate } = await run();

		expect(generate).toHaveBeenCalledTimes(1);
		expect(active.items).toHaveLength(3);
		expect(JSON.parse(fake.values.get(level.id)!).items).toHaveLength(3);
	});

	it('starts on the first item, unfinished', async () => {
		const { run: active } = await run();

		expect(active.index).toBe(0);
		expect(active.item.target).toEqual(['a']);
		expect(active.answered).toBe(false);
		expect(active.finished).toBe(false);
		expect(active.score).toBeNull();
	});

	it('presents the first item at the difficulty its section starts on', async () => {
		const { run: active } = await run({ difficulty: { start: 2, min: 0, max: 2 } });
		expect(active.difficulty).toBe(2);
		expect(active.items.map((item) => item.difficulty)).toEqual([2, 2, 2]);
	});

	it('does not offer a replay of a level that was never finished', async () => {
		expect((await run()).run.replayable).toBe(false);
	});
});

describe('reopening a level', () => {
	it('replays exactly what was generated the first time', async () => {
		const items = three();
		items[0].distractors = [['kept']];
		stored(items);

		const { run: active, generate } = await run();
		expect(generate).not.toHaveBeenCalled();
		expect(active.item.distractors).toEqual([['kept']]);
	});

	it('regenerates a stored level that somehow has no items', async () => {
		stored([]);
		const { generate } = await run();
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('resumes on the first item not yet answered correctly', async () => {
		const items = three();
		items[0].responses = [['a']];
		items[1].responses = [['wrong']];
		stored(items);

		const { run: active } = await run();
		expect(active.index).toBe(1);
		expect(active.answered).toBe(false);
	});

	it('skips an item that was answered, even if its feedback was never dismissed', async () => {
		// docs/original-app/navigation.md: the first item not yet answered
		// correctly, so leaving on a feedback card costs nothing on the way back.
		const items = three();
		items[0].responses = [['a']];
		stored(items);

		const { run: active } = await run();
		expect(active.index).toBe(1);
		expect(active.answered).toBe(false);
	});

	it('resumes on the last item when every item is answered but the level is not', async () => {
		// Answering the last item and leaving before "Doorgaan" is what does this.
		const items = three();
		for (const [index, token] of ['a', 'b', 'c'].entries()) items[index].responses = [[token]];
		stored(items);

		const { run: active } = await run();
		expect(active.index).toBe(2);
		expect(active.answered).toBe(true);
	});

	it('offers a replay of a level that was already finished when it was opened', async () => {
		stored(three(), 4);
		const { run: active } = await run();
		expect(active.finished).toBe(true);
		expect(active.score).toBe(4);
		expect(active.replayable).toBe(true);
	});
});

describe('answering an item', () => {
	it('records every attempt, in order', async () => {
		const { run: active } = await run();
		active.respond(['x']);
		active.respond(['y']);
		active.respond(['a']);

		expect(active.item.responses).toEqual([['x'], ['y'], ['a']]);
		expect(active.answered).toBe(true);
	});

	it('writes every attempt to localStorage, so leaving keeps it', async () => {
		const { run: active } = await run();
		active.respond(['x']);
		expect(JSON.parse(fake.values.get(level.id)!).items[0].responses).toEqual([['x']]);
	});

	it('is answered only when the latest response is the target', async () => {
		const { run: active } = await run();
		active.respond(['x']);
		expect(active.answered).toBe(false);
		active.respond(['a']);
		expect(active.answered).toBe(true);
		expect(active.firstTry).toBe(false);
	});

	it('knows a first-try answer from one that took attempts', async () => {
		const { run: active } = await run();
		active.respond(['a']);
		expect(active.firstTry).toBe(true);
	});

	it('ignores a response once the level is finished', async () => {
		stored(three(), 4);
		const { run: active } = await run();
		active.respond(['x']);
		expect(active.item.responses).toEqual([]);
	});
});

describe('adaptive difficulty', () => {
	it('goes up after a first-try answer', async () => {
		const { run: active } = await run();
		active.respond(['a']);
		expect(active.items[1].difficulty).toBe(1);
	});

	it('goes down after an item that took more than one attempt', async () => {
		const { run: active } = await run({ difficulty: { start: 1, min: 0, max: 2 } });
		active.respond(['x']);
		active.respond(['a']);
		expect(active.items[1].difficulty).toBe(0);
	});

	it('never changes the item being played', async () => {
		const { run: active } = await run();
		active.respond(['x']);
		expect(active.difficulty).toBe(0);
		active.respond(['a']);
		expect(active.difficulty).toBe(0);
		expect(active.item.difficulty).toBe(0);
	});

	it('only ever changes the next item, not the ones after it', async () => {
		const { run: active } = await run();
		active.respond(['a']);
		expect(active.items.map((item) => item.difficulty)).toEqual([0, 1, 0]);
	});

	it('stays inside the range of the game', async () => {
		const { run: active } = await run({ difficulty: { start: 2, min: 0, max: 2 } });
		active.respond(['a']);
		expect(active.items[1].difficulty).toBe(2);

		active.proceed();
		active.respond(['x']);
		active.respond(['b']);
		expect(active.items[2].difficulty).toBe(1);
	});

	it('reaches below zero where the game allows it', async () => {
		const { run: active } = await run({ difficulty: { start: 0, min: -1, max: 1 } });
		active.respond(['x']);
		active.respond(['a']);
		expect(active.items[1].difficulty).toBe(-1);
	});

	it('leaves difficulty alone for a game that has none', async () => {
		const { run: active } = await run({ difficulty: null });
		active.respond(['a']);
		expect(active.items.map((item) => item.difficulty)).toEqual([0, 0, 0]);
	});
});

describe('working through a level', () => {
	it('moves on to the next item', async () => {
		const { run: active } = await run();
		active.respond(['a']);
		active.proceed();

		expect(active.index).toBe(1);
		expect(active.item.target).toEqual(['b']);
		expect(active.answered).toBe(false);
	});

	it('scores the level on the last "Doorgaan", and not before', async () => {
		const { run: active } = await run();
		for (const token of ['a', 'b', 'c']) {
			active.respond([token]);
			expect(active.finished).toBe(false);
			active.proceed();
		}

		expect(active.finished).toBe(true);
		expect(active.score).toBe(6);
	});

	it('stores the score, so the overview shows it', async () => {
		const { run: active, progress } = await run();
		for (const token of ['a', 'b', 'c']) {
			active.respond([token]);
			active.proceed();
		}

		expect(progress.score(level.id)).toBe(6);
		expect(JSON.parse(fake.values.get(level.id)!).score).toBe(6);
	});

	it('counts the mistakes of the whole level in the score', async () => {
		const { run: active } = await run();
		// Nine tolerated mistakes over three items; three of them cost two points.
		active.respond(['x']);
		active.respond(['x']);
		active.respond(['x']);
		active.respond(['a']);
		active.proceed();
		active.respond(['b']);
		active.proceed();
		active.respond(['c']);
		active.proceed();

		expect(active.score).toBe(4);
	});

	it('does nothing on "Doorgaan" once the level is finished', async () => {
		stored(three(), 2);
		const { run: active } = await run();
		active.proceed();
		expect(active.score).toBe(2);
		expect(active.index).toBe(0);
	});

	it('does not offer a replay of the level it has just played', async () => {
		const { run: active } = await run();
		for (const token of ['a', 'b', 'c']) {
			active.respond([token]);
			active.proceed();
		}
		expect(active.replayable).toBe(false);
	});
});

describe('replaying a finished level', () => {
	it('starts over with freshly generated items', async () => {
		stored(three(), 1);
		const { run: active, generate } = await run();
		active.restart();

		expect(generate).toHaveBeenCalledTimes(1);
		expect(active.finished).toBe(false);
		expect(active.score).toBeNull();
		expect(active.index).toBe(0);
		expect(active.items.every((item) => item.responses.length === 0)).toBe(true);
	});

	it('throws the old score away in localStorage too', async () => {
		stored(three(), 1);
		const { run: active, progress } = await run();
		active.restart();

		expect(progress.score(level.id)).toBeNull();
		expect(JSON.parse(fake.values.get(level.id)!).score).toBeNull();
	});
});

describe('the progress dots', () => {
	it('marks the item being played, and nothing beyond it', async () => {
		const { run: active } = await run();
		expect([0, 1, 2].map((index) => active.dot(index))).toEqual(['current', 'neutral', 'neutral']);
	});

	it('marks a first-try answer correct and anything else wrong', async () => {
		const { run: active } = await run();
		active.respond(['a']);
		active.proceed();
		active.respond(['x']);
		active.respond(['b']);
		active.proceed();

		expect([0, 1, 2].map((index) => active.dot(index))).toEqual(['correct', 'wrong', 'current']);
	});

	it('has one dot per item, so the length of the level is clear up front', async () => {
		const { run: active } = await run();
		expect(active.items).toHaveLength(3);
	});
});
