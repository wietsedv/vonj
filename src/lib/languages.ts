/**
 * The languages the app teaches, and the little that differs between them
 * outside the content set.
 *
 * The original app shipped each language as its own build, from its own branch
 * of `../vonj-app`: `gronings` and `achterhoeks`. Apart from the dataset and the
 * media, which `scripts/build-content.mjs` generates per language, the branches
 * differ only in a handful of strings, the palette and the app icon. The
 * strings are here, quoted verbatim from the file named beside each; the
 * palette is in `src/app.css`. Every game mechanic is shared.
 *
 * The icon of each language is its flag. The Achterhoeks branch's launcher
 * icon already is one; for Gronings, whose launcher icon is not, the flag of
 * the province is drawn in the app's own palette in
 * `src/lib/assets/flag-gronings.svg`.
 */
import achterhoeksIcon from '$lib/assets/favicon-achterhoeks.png';
import groningsIcon from '$lib/assets/favicon-gronings.png';
import type { Language } from '$lib/types';

export interface LanguageInfo {
	id: Language;
	/** The app's name. `PageBase.vue`, the default title of every screen. */
	appName: string;
	/**
	 * The question in the global overview header. `GlobalOverview.vue`; for
	 * Gronings the original asked "Hoe goed is jouw Grunnegs?", see
	 * `docs/rewrite.md`.
	 */
	question: string;
	/**
	 * The label above text in the language being taught. `LevelWriteWords.vue`,
	 * the counterpart of "Nederlands" on the writing prompt.
	 */
	label: string;
	/**
	 * The BCP 47 tag of the language, for the `lang` attribute on its text:
	 * ISO 639-3 `gos` is Gronings, `act` is Achterhoeks.
	 */
	lang: string;
	/**
	 * The logo of the language: the favicon, the home-screen icon and the
	 * picture on its card in the language picker. Achterhoeks is the branch's
	 * `App_Resources/Android/src/main/res/drawable-xxxhdpi/icon.png`; Gronings is
	 * `flag-gronings.svg`, rendered to 192 px.
	 */
	icon: string;
}

/** In the order the language picker shows them. */
export const languages: LanguageInfo[] = [
	{
		id: 'gronings',
		appName: 'Van Old noar Jong: Grunnegs',
		question: 'Hoe goed is jouw Gronings?',
		label: 'Grunnegs',
		lang: 'gos',
		icon: groningsIcon
	},
	{
		id: 'achterhoeks',
		appName: 'Van Old naor Jong: Achterhooks',
		question: 'Hoe goed is jouw Achterhooks?',
		label: 'Achterhooks',
		lang: 'act',
		icon: achterhoeksIcon
	}
];

const byId = new Map(languages.map((language) => [language.id, language]));

export const isLanguage = (value: string): value is Language => byId.has(value as Language);

export function getLanguage(id: Language): LanguageInfo {
	const language = byId.get(id);
	if (!language) throw new Error(`Unknown language "${id}".`);
	return language;
}
