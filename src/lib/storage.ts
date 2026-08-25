/**
 * A localStorage wrapper that never throws.
 *
 * Reads and writes fail in private browsing modes and on a full quota, and
 * stored JSON can be malformed or left over from an older version of the app.
 * All of that is treated the same way: as "nothing stored". See
 * `docs/rewrite.md`.
 */
import { browser } from '$app/environment';

/**
 * Reads a JSON value and validates it. Anything unreadable, unparseable or
 * rejected by `validate` comes back as null.
 */
export function read<T>(key: string, validate: (value: unknown) => T | null): T | null {
	if (!browser) return null;
	let raw: string | null;
	try {
		raw = localStorage.getItem(key);
	} catch {
		return null;
	}
	if (raw === null) return null;
	try {
		return validate(JSON.parse(raw));
	} catch {
		return null;
	}
}

/** Writes a JSON value. Returns whether it was actually stored. */
export function write(key: string, value: unknown): boolean {
	if (!browser) return false;
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

export function remove(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Nothing to do: the value stays, and the next read decides what it means.
	}
}
