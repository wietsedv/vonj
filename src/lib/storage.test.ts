/**
 * The localStorage wrapper. Its whole job is to never throw, so most of these
 * tests are about the ways localStorage can fail.
 */
import * as storage from '$lib/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Flipped per test: the wrapper does nothing at all during SSR.
let isBrowser = true;
vi.mock('$app/environment', () => ({
	get browser() {
		return isBrowser;
	}
}));

class FakeStorage {
	values = new Map<string, string>();
	throwOnGet = false;
	throwOnSet = false;
	throwOnRemove = false;

	getItem(key: string): string | null {
		if (this.throwOnGet) throw new DOMException('SecurityError');
		return this.values.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		if (this.throwOnSet) throw new DOMException('QuotaExceededError');
		this.values.set(key, String(value));
	}
	removeItem(key: string): void {
		if (this.throwOnRemove) throw new DOMException('SecurityError');
		this.values.delete(key);
	}
}

let fake: FakeStorage;

const isNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const isStringList = (value: unknown): string[] | null =>
	Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : null;

beforeEach(() => {
	isBrowser = true;
	fake = new FakeStorage();
	vi.stubGlobal('localStorage', fake);
});

describe('write and read', () => {
	it('reads back what it wrote', () => {
		expect(storage.write('score', 6)).toBe(true);
		expect(storage.read('score', isNumber)).toBe(6);
	});

	it('stores JSON', () => {
		storage.write('answer', ['aa', 'oo']);
		expect(fake.values.get('answer')).toBe('["aa","oo"]');
		expect(storage.read('answer', isStringList)).toEqual(['aa', 'oo']);
	});

	it('has nothing for a key that was never written', () => {
		expect(storage.read('afwezig', isNumber)).toBeNull();
	});

	it('overwrites an existing value', () => {
		storage.write('score', 3);
		storage.write('score', 6);
		expect(storage.read('score', isNumber)).toBe(6);
	});
});

describe('anything unusable counts as nothing stored', () => {
	it('rejects a value the validator turns down', () => {
		storage.write('score', 'zes');
		expect(storage.read('score', isNumber)).toBeNull();
	});

	it('rejects malformed JSON', () => {
		fake.values.set('score', '{niet json');
		expect(storage.read('score', isNumber)).toBeNull();
	});

	it('rejects a validator that throws', () => {
		storage.write('score', 6);
		expect(
			storage.read('score', () => {
				throw new Error('kapot');
			})
		).toBeNull();
	});

	it('survives a localStorage that refuses to be read', () => {
		storage.write('score', 6);
		fake.throwOnGet = true;
		expect(storage.read('score', isNumber)).toBeNull();
	});
});

describe('writes that cannot be stored', () => {
	it('reports a full quota rather than throwing', () => {
		fake.throwOnSet = true;
		expect(storage.write('score', 6)).toBe(false);
	});

	it('reports a value that cannot be serialised', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(storage.write('score', cyclic)).toBe(false);
	});
});

describe('remove', () => {
	it('deletes a value', () => {
		storage.write('score', 6);
		storage.remove('score');
		expect(storage.read('score', isNumber)).toBeNull();
	});

	it('does not mind removing something that is not there', () => {
		expect(() => storage.remove('afwezig')).not.toThrow();
	});

	it('swallows a localStorage that refuses to delete', () => {
		storage.write('score', 6);
		fake.throwOnRemove = true;
		expect(() => storage.remove('score')).not.toThrow();
	});
});

describe('during SSR and prerendering', () => {
	beforeEach(() => {
		isBrowser = false;
	});

	it('reads nothing', () => {
		fake.values.set('score', '6');
		expect(storage.read('score', isNumber)).toBeNull();
	});

	it('writes nothing', () => {
		expect(storage.write('score', 6)).toBe(false);
		expect(fake.values.size).toBe(0);
	});

	it('removes nothing', () => {
		fake.values.set('score', '6');
		storage.remove('score');
		expect(fake.values.get('score')).toBe('6');
	});

	it('never touches localStorage at all', () => {
		// Not just "returns null": localStorage does not exist here to be touched.
		vi.stubGlobal('localStorage', undefined);
		expect(() => storage.read('score', isNumber)).not.toThrow();
		expect(() => storage.write('score', 6)).not.toThrow();
		expect(() => storage.remove('score')).not.toThrow();
	});
});
