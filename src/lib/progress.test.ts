/**
 * The progress model: what is stored per level, when stored levels are thrown
 * away, and how a set of levels adds up to a score.
 *
 * The store is a module singleton with a one-shot `load()`, so every test takes
 * a fresh copy of the module with `vi.resetModules()`.
 */
import { allLevels, categoryLevels, sectionLevels } from '$lib/content';
import { dataVersion } from '$lib/content/version';
import { item, level } from '../tests/fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

class FakeStorage {
	values = new Map<string, string>();
	throwOnSet = false;

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		if (this.throwOnSet) throw new DOMException('QuotaExceededError');
		this.values.set(key, String(value));
	}
	removeItem(key: string): void {
		this.values.delete(key);
	}
}

let fake: FakeStorage;

type Store = (typeof import('$lib/progress.svelte'))['progress'];

/** A store that has not read localStorage yet. */
async function fresh(): Promise<Store> {
	vi.resetModules();
	return (await import('$lib/progress.svelte')).progress;
}

/** A store that has read whatever the test put in localStorage. */
async function loaded(): Promise<Store> {
	const progress = await fresh();
	progress.load();
	return progress;
}

/** Puts a finished level straight into localStorage, as an earlier visit would. */
function stored(id: string, score: number | null) {
	fake.values.set('dataVersion', JSON.stringify(dataVersion));
	fake.values.set(id, JSON.stringify(level(score)));
}

beforeEach(() => {
	fake = new FakeStorage();
	vi.stubGlobal('localStorage', fake);
});

describe('load', () => {
	it('starts out empty, so the server-rendered markup is never contradicted', async () => {
		const progress = await fresh();
		expect(progress.loaded).toBe(false);
		expect(progress.level('luisteren.woorden.bragel')).toBeNull();
		expect(progress.category('luisteren')).toEqual({ levels: 12, completed: 0, score: null });
	});

	it('is loaded once it has read localStorage', async () => {
		const progress = await loaded();
		expect(progress.loaded).toBe(true);
	});

	it('records the content version on a first visit', async () => {
		await loaded();
		expect(fake.values.get('dataVersion')).toBe(JSON.stringify(dataVersion));
	});

	it('stores nothing else on a first visit', async () => {
		await loaded();
		expect([...fake.values.keys()]).toEqual(['dataVersion']);
	});

	it('reads a level stored by an earlier visit', async () => {
		stored('luisteren.woorden.bragel', 6);
		const progress = await loaded();
		expect(progress.score('luisteren.woorden.bragel')).toBe(6);
		expect(progress.level('luisteren.woorden.bragel')?.items).toHaveLength(1);
	});

	it('does nothing on a second call', async () => {
		const progress = await loaded();
		progress.save('luisteren.woorden.bragel', level(6));
		fake.values.delete('luisteren.woorden.bragel');
		progress.load();
		// Still the in-memory value: the second load() was a no-op.
		expect(progress.score('luisteren.woorden.bragel')).toBe(6);
	});
});

describe('content invalidation', () => {
	it('keeps stored levels when the content version matches', async () => {
		stored('lezen.zinnen.bragel', 4);
		const progress = await loaded();
		expect(progress.score('lezen.zinnen.bragel')).toBe(4);
	});

	it('discards every stored level when the version is older', async () => {
		stored('lezen.zinnen.bragel', 4);
		stored('spreken.korte-woorden.kopstubber', 2);
		fake.values.set('dataVersion', JSON.stringify(dataVersion - 1));

		const progress = await loaded();
		expect(progress.score('lezen.zinnen.bragel')).toBeNull();
		expect(progress.score('spreken.korte-woorden.kopstubber')).toBeNull();
		expect([...fake.values.keys()]).toEqual(['dataVersion']);
	});

	it('discards every stored level when there is no version at all', async () => {
		fake.values.set('lezen.zinnen.bragel', JSON.stringify(level(4)));
		const progress = await loaded();
		expect(progress.score('lezen.zinnen.bragel')).toBeNull();
	});

	it('writes the current version after invalidating', async () => {
		fake.values.set('dataVersion', JSON.stringify(dataVersion - 1));
		await loaded();
		expect(fake.values.get('dataVersion')).toBe(JSON.stringify(dataVersion));
	});

	it('discards a version that is not a number', async () => {
		stored('lezen.zinnen.bragel', 4);
		fake.values.set('dataVersion', '"eerste"');
		const progress = await loaded();
		expect(progress.score('lezen.zinnen.bragel')).toBeNull();
	});

	it('leaves keys it does not own alone', async () => {
		fake.values.set('een-andere-app', 'niet van ons');
		fake.values.set('dataVersion', JSON.stringify(dataVersion - 1));
		await loaded();
		expect(fake.values.get('een-andere-app')).toBe('niet van ons');
	});
});

describe('a stored level that cannot be replayed counts as unplayed', () => {
	const id = 'schrijven.woorden.bragel';

	const rejects = (raw: string) => async () => {
		fake.values.set('dataVersion', JSON.stringify(dataVersion));
		fake.values.set(id, raw);
		const progress = await loaded();
		expect(progress.level(id)).toBeNull();
		expect(progress.score(id)).toBeNull();
	};

	it('rejects text that is not JSON', rejects('helemaal geen json'));
	it('rejects null', rejects('null'));
	it('rejects a bare number', rejects('6'));
	it('rejects a level without items', rejects('{"score":6}'));
	it('rejects items that are not a list', rejects('{"items":"geen lijst","score":6}'));
	it('rejects a score that is not a number', rejects('{"items":[],"score":"zes"}'));
	it(
		'rejects an item without a target',
		rejects(
			JSON.stringify({
				items: [{ source: 'x', difficulty: 1, distractors: [], responses: [] }],
				score: null
			})
		)
	);
	it(
		'rejects a target that is not a list of strings',
		rejects(JSON.stringify({ items: [item({ target: [1] as unknown as string[] })], score: null }))
	);
	it(
		'rejects a response that is not a list of strings',
		rejects(
			JSON.stringify({ items: [item({ responses: ['aa'] as unknown as string[][] })], score: null })
		)
	);
	it(
		'rejects a difficulty that is not a number',
		rejects(
			JSON.stringify({ items: [item({ difficulty: 'hoog' as unknown as number })], score: null })
		)
	);

	it('accepts an unfinished level, so a level can be resumed', async () => {
		fake.values.set('dataVersion', JSON.stringify(dataVersion));
		fake.values.set(id, JSON.stringify(level(null, [item(), item({ responses: [] })])));
		const progress = await loaded();
		expect(progress.score(id)).toBeNull();
		expect(progress.level(id)?.items).toHaveLength(2);
	});

	it('accepts a level with no items yet', async () => {
		fake.values.set('dataVersion', JSON.stringify(dataVersion));
		fake.values.set(id, JSON.stringify({ items: [], score: null }));
		const progress = await loaded();
		expect(progress.level(id)).toEqual({ items: [], score: null });
	});

	it('does not throw on any of it', async () => {
		fake.values.set('dataVersion', JSON.stringify(dataVersion));
		for (const level of allLevels()) fake.values.set(level.id, '{kapot');
		await expect(loaded()).resolves.toBeDefined();
	});
});

describe('save', () => {
	it('remembers a level and writes it through', async () => {
		const progress = await loaded();
		const stored = level(5, [item(), item()]);
		progress.save('spreken.lange-woorden.bragel', stored);

		expect(progress.level('spreken.lange-woorden.bragel')).toEqual(stored);
		expect(JSON.parse(fake.values.get('spreken.lange-woorden.bragel')!)).toEqual(stored);
	});

	it('keeps the items, not just the score, so a level replays identically', async () => {
		const progress = await loaded();
		const items = [item({ source: 'bragel-3', target: ['oa', 'n'], distractors: [['aa'], ['m']] })];
		progress.save('spreken.lange-woorden.bragel', level(null, items));
		expect(progress.level('spreken.lange-woorden.bragel')?.items).toEqual(items);
	});

	it('overwrites a level saved earlier', async () => {
		const progress = await loaded();
		progress.save('spreken.lange-woorden.bragel', level(null));
		progress.save('spreken.lange-woorden.bragel', level(3));
		expect(progress.score('spreken.lange-woorden.bragel')).toBe(3);
	});

	it('still remembers a level localStorage refused to keep', async () => {
		const progress = await loaded();
		fake.throwOnSet = true;
		expect(() => progress.save('spreken.lange-woorden.bragel', level(6))).not.toThrow();
		expect(progress.score('spreken.lange-woorden.bragel')).toBe(6);
	});
});

describe('a scope of levels', () => {
	it('counts the levels of a section', async () => {
		const progress = await loaded();
		expect(progress.section('luisteren', 'woorden')).toEqual({
			levels: 4,
			completed: 0,
			score: null
		});
	});

	it('counts finished levels only', async () => {
		const progress = await loaded();
		progress.save('luisteren.woorden.bragel', level(6));
		progress.save('luisteren.woorden.kopstubber', level(null));
		expect(progress.section('luisteren', 'woorden').completed).toBe(1);
	});

	it('shows no score until every level of the scope is finished', async () => {
		const progress = await loaded();
		for (const story of ['bragel', 'kopstubber', 'scheuvels']) {
			progress.save(`luisteren.woorden.${story}`, level(6));
		}
		expect(progress.section('luisteren', 'woorden').score).toBeNull();
	});

	it('averages the level scores once they are all finished', async () => {
		const progress = await loaded();
		const scores = [6, 3, 4, 5];
		for (const [index, story] of ['bragel', 'kopstubber', 'scheuvels', 'zoepenbrij'].entries()) {
			progress.save(`luisteren.woorden.${story}`, level(scores[index]));
		}
		expect(progress.section('luisteren', 'woorden')).toEqual({
			levels: 4,
			completed: 4,
			score: 4.5
		});
	});

	it('does not round the average before it becomes stars', async () => {
		const progress = await loaded();
		for (const [index, story] of ['bragel', 'kopstubber', 'scheuvels', 'zoepenbrij'].entries()) {
			progress.save(`luisteren.woorden.${story}`, level([6, 6, 6, 0][index]));
		}
		expect(progress.section('luisteren', 'woorden').score).toBe(4.5);
	});

	it('adds up a whole category across its sections', async () => {
		const progress = await loaded();
		for (const level_ of categoryLevels('schrijven')) progress.save(level_.id, level(6));
		expect(progress.category('schrijven')).toEqual({ levels: 8, completed: 8, score: 6 });
	});

	it('adds up everything', async () => {
		const progress = await loaded();
		for (const level_ of allLevels()) progress.save(level_.id, level(3));
		expect(progress.everything()).toEqual({ levels: 44, completed: 44, score: 3 });
	});

	it('is empty for a section that does not exist', async () => {
		const progress = await loaded();
		expect(progress.section('luisteren', 'zinnen')).toEqual({
			levels: 0,
			completed: 0,
			score: null
		});
	});
});

describe('resetting', () => {
	/** Fills every level of the app with a finished score. */
	async function everythingPlayed(): Promise<Store> {
		const progress = await loaded();
		for (const level_ of allLevels()) progress.save(level_.id, level(6));
		return progress;
	}

	it('throws away one level, items and all', async () => {
		const progress = await everythingPlayed();
		progress.resetLevel('luisteren.woorden.bragel');
		expect(progress.level('luisteren.woorden.bragel')).toBeNull();
		expect(fake.values.has('luisteren.woorden.bragel')).toBe(false);
		expect(progress.score('luisteren.woorden.kopstubber')).toBe(6);
	});

	it('throws away a section', async () => {
		const progress = await everythingPlayed();
		progress.resetSection('luisteren', 'woorden');
		for (const level_ of sectionLevels('luisteren', 'woorden')) {
			expect(progress.level(level_.id)).toBeNull();
		}
		expect(progress.section('luisteren', 'verhaaltjes').completed).toBe(4);
	});

	it('throws away a category', async () => {
		const progress = await everythingPlayed();
		progress.resetCategory('luisteren');
		expect(progress.category('luisteren').completed).toBe(0);
		expect(progress.category('lezen').completed).toBe(12);
	});

	it('throws away everything but the content version', async () => {
		const progress = await everythingPlayed();
		progress.resetEverything();
		expect(progress.everything().completed).toBe(0);
		expect([...fake.values.keys()]).toEqual(['dataVersion']);
	});

	it('leaves the store loaded, so nothing flashes back to unknown', async () => {
		const progress = await everythingPlayed();
		progress.resetEverything();
		expect(progress.loaded).toBe(true);
	});
});

describe('an item', () => {
	it('is finished when the last response is the target', async () => {
		const { isItemComplete } = await import('$lib/progress.svelte');
		expect(isItemComplete(item({ target: ['aa'], responses: [['aa']] }))).toBe(true);
	});

	it('is finished even after wrong attempts', async () => {
		const { isItemComplete } = await import('$lib/progress.svelte');
		expect(isItemComplete(item({ target: ['aa'], responses: [['oo'], ['oe'], ['aa']] }))).toBe(
			true
		);
	});

	it('is unfinished when the last response is wrong', async () => {
		const { isItemComplete } = await import('$lib/progress.svelte');
		expect(isItemComplete(item({ target: ['aa'], responses: [['aa'], ['oo']] }))).toBe(false);
	});

	it('is unfinished when nothing has been answered', async () => {
		const { isItemComplete } = await import('$lib/progress.svelte');
		expect(isItemComplete(item({ responses: [] }))).toBe(false);
	});

	it('needs every token of a multi-part answer to match', async () => {
		const { isItemComplete } = await import('$lib/progress.svelte');
		const target = ['b', 'r', 'oa'];
		expect(isItemComplete(item({ target, responses: [['b', 'r', 'oa']] }))).toBe(true);
		expect(isItemComplete(item({ target, responses: [['b', 'r', 'aa']] }))).toBe(false);
		expect(isItemComplete(item({ target, responses: [['b', 'r']] }))).toBe(false);
		expect(isItemComplete(item({ target, responses: [['b', 'r', 'oa', 'oa']] }))).toBe(false);
	});

	it('costs nothing when it was right first time', async () => {
		const { itemMistakes } = await import('$lib/progress.svelte');
		expect(itemMistakes(item({ responses: [['aa']] }))).toBe(0);
	});

	it('costs one per extra attempt', async () => {
		const { itemMistakes } = await import('$lib/progress.svelte');
		expect(itemMistakes(item({ responses: [['oo'], ['oe'], ['aa']] }))).toBe(2);
	});

	it('costs nothing while it is unanswered', async () => {
		const { itemMistakes } = await import('$lib/progress.svelte');
		expect(itemMistakes(item({ responses: [] }))).toBe(0);
	});
});
