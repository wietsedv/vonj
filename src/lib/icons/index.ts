import type { Category } from '$lib/types';
import type { Component } from 'svelte';
import Listen from './listen.svelte';
import Read from './read.svelte';
import Speak from './speak.svelte';
import Write from './write.svelte';

/**
 * One icon per category, used on its card and on all of its sections. The
 * content data carries icons of its own, but they are FontAwesome codepoints
 * from the native app; here they are Svelte components.
 */
export const categoryIcons: Record<Category, Component> = {
	luisteren: Listen,
	lezen: Read,
	schrijven: Write,
	spreken: Speak
};
