/**
 * Regenerates src/lib/content from the original app's bundled datasets.
 *
 *   node scripts/build-content.mjs [--source ../vonj-app] [--only <language>] [--skip-media]
 *
 * The original app ships one language per git branch: `gronings` and
 * `achterhoeks`. Each branch is read straight out of git with `git archive`, so
 * nothing is checked out and the working tree of the original is never touched;
 * whichever branch it happens to be on does not matter either. The original app
 * is read-only reference material: this script only reads from it.
 *
 * Every language is written to its own directory, src/lib/content/<language>/,
 * holding categories.json, sounds.json, stories/*.json and assets/**. `--only`
 * rebuilds a single language and leaves the others alone.
 *
 * Media conversion needs ffmpeg with libwebp, libwebp_anim and libmp3lame.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const repository = resolve(repo, flag('source', '../vonj-app'));
const only = flag('only', null);
const skipMedia = args.includes('--skip-media');

const contentDir = join(repo, 'src/lib/content');

/**
 * The languages of the content set, each with the branch of the original app it
 * is read from. The key is the language id the original's dataset itself uses
 * (`lang_id`), which is also the first segment of every URL and storage key.
 */
const LANGUAGES = {
	gronings: { branch: 'gronings' },
	achterhoeks: { branch: 'achterhoeks' }
};

/** The original's English ids, mapped onto the Dutch ids this app uses. */
const CATEGORY_IDS = {
	listen: 'luisteren',
	read: 'lezen',
	write: 'schrijven',
	speak: 'spreken'
};

const SECTION_IDS = {
	stories: 'verhaaltjes',
	words: 'woorden',
	words_time: 'woorden-tijdslimiet',
	sentences: 'zinnen',
	sentences_time: 'zinnen-tijdslimiet',
	words1: 'korte-woorden',
	words2: 'normale-woorden',
	words3: 'lange-woorden'
};

/**
 * Typos in the original's Dutch copy, corrected on the way through, per
 * language. Keyed by the whole original line, so a fix that lands upstream
 * stops being applied here instead of being applied twice, and an unused entry
 * is reported. The Achterhoeks branch already has this one fixed.
 *
 * This is the only place where the app's Dutch differs from the original's; the
 * Gronings and Achterhoeks content itself is never corrected.
 */
const COPY_FIXES = {
	gronings: {
		'Sleep te zinnen in de juiste volgorde om het verhaaltje leesbaar te maken.':
			'Sleep de zinnen in de juiste volgorde om het verhaaltje leesbaar te maken.'
	},
	achterhoeks: {}
};

/**
 * Sounds a dataset lists, and words use, but the branch has no recording for.
 * The Achterhoeks inventory names "oa" and points at klanken/audio/oa.mp3, a
 * file that was never committed, so the original played nothing for it. Such a
 * sound is generated without `audio` and plays as silence here too. Anything
 * else that is missing is still an error.
 */
const MISSING_SOUND_RECORDINGS = {
	gronings: [],
	achterhoeks: ['oa']
};

/** Sounds whose recording filename is not usable as a URL path segment. */
const SOUND_SLUGS = {
	'G!': 'g-hard',
	'’': 'glottal'
};

const log = (...m) => console.log(...m);
const fail = (m) => {
	console.error(`\n${m}`);
	process.exit(1);
};

/* -------------------------------------------------------------------------- */
/* Reading the original dataset                                               */
/* -------------------------------------------------------------------------- */

/**
 * Exports the dataset and the media of one branch into a scratch directory with
 * `git archive`, which reads the object database only: no checkout, no change
 * to the original's working tree, index or HEAD.
 */
async function exportBranch(language, branch) {
	if (!existsSync(join(repository, '.git')))
		fail(`Original app not found at ${repository}\nPass --source <path to vonj-app>.`);
	const target = join(repo, 'node_modules/.cache/vonj-source', language);
	await rm(target, { recursive: true, force: true });
	await mkdir(target, { recursive: true });
	const archive = join(target, 'source.tar');
	try {
		await run(
			'git',
			[
				'-C',
				repository,
				'archive',
				'--format=tar',
				`--output=${archive}`,
				branch,
				'app/lib/offline.ts',
				`app/assets/static/${language}`
			],
			{ maxBuffer: 1 << 26 }
		);
	} catch (error) {
		fail(`Could not read branch "${branch}" of ${repository}:\n${error.stderr ?? error}`);
	}
	await run('tar', ['-xf', archive, '-C', target]);
	await rm(archive, { force: true });
	return target;
}

/**
 * offline.ts is a TypeScript module holding one object literal. Stripping the
 * single type annotation makes it valid ESM, which node can import directly.
 */
async function readOffline(source) {
	const file = join(source, 'app/lib/offline.ts');
	const ts = await readFile(file, 'utf8');
	const js = ts.replace('const root: { [key: string]: object } = {', 'const root = {');
	if (js === ts) fail('Could not strip the type annotation from offline.ts; its shape changed.');
	const tmp = join(source, 'offline.mjs');
	await writeFile(tmp, js);
	const { default: root } = await import(`${tmp}?t=${Date.now()}`);
	await rm(tmp, { force: true });
	return root;
}

/** Fold a word to an ASCII path segment: "bèr" -> "ber". */
function slugify(value) {
	return value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Slugs have to be unique and stable across runs: "of" and "òf" both fold to
 * "of", so the names are assigned in sorted order and later ones get a suffix.
 */
function uniqueSlugs(values) {
	const taken = new Map();
	const slugs = new Map();
	for (const value of [...values].sort()) {
		const base = slugify(value) || 'x';
		const seen = taken.get(base) ?? 0;
		taken.set(base, seen + 1);
		slugs.set(value, seen === 0 ? base : `${base}-${seen + 1}`);
	}
	return slugs;
}

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The dataset of one branch: its root object, plus where in it the language's
 * categories and stories live. Both keys are read from the dataset's own
 * presets (`GET /` in the original), which list one language with one school,
 * rather than assumed.
 */
async function readLanguage(language) {
	const source = await exportBranch(language, LANGUAGES[language].branch);
	const root = await readOffline(source);

	const presets = root['']?.languages;
	if (presets?.length !== 1 || presets[0].schools?.length !== 1)
		fail(`${language}: expected the presets to list exactly one language with one school.`);
	if (presets[0].id !== language)
		fail(`${language}: the branch's dataset is for "${presets[0].id}".`);

	const categories = root[`/categories/${presets[0].schools[0].id}`];
	if (!categories) fail(`${language}: offline.ts has no categories for its school.`);
	if (categories.lang_id !== language)
		fail(`${language}: the categories are for "${categories.lang_id}".`);

	return {
		id: language,
		source,
		root,
		categories,
		target: (key) => {
			const target = root[`/target/${language}/${key}`];
			if (!target) fail(`${language}: offline.ts has no story "${key}".`);
			return target;
		},
		/** "~/assets/static/gronings/klanken/audio/aa.mp3" -> absolute path. */
		path: (src) => join(source, 'app', src.replace(/^~\//, ''))
	};
}

function buildCategories(lang) {
	const source = lang.categories;
	const fixes = COPY_FIXES[lang.id];

	const applied = new Set();
	const fix = (line) => {
		const fixed = fixes[line];
		if (!fixed) return line;
		applied.add(line);
		return fixed;
	};

	const categories = source.categories.map((category) => {
		const id = CATEGORY_IDS[category.id];
		if (!id) fail(`Unknown category id "${category.id}" in the original dataset.`);
		return {
			id,
			name: category.name,
			description: fix(category.description),
			sections: category.sections.map((section) => {
				const sectionId = SECTION_IDS[section.id];
				if (!sectionId) fail(`Unknown section id "${section.id}" in the original dataset.`);
				return {
					id: sectionId,
					name: section.name,
					// Section descriptions hold up to two lines: the overview shows the
					// first, the level shows both.
					description: section.description.split('\n').map(fix),
					stories: section.levels.map((level) => level.word)
				};
			})
		};
	});

	for (const line of Object.keys(fixes)) {
		if (!applied.has(line)) {
			console.warn(`  note: copy fix no longer matches anything, drop it:\n    "${line}"`);
		}
	}

	return categories;
}

function buildStories(lang, storyKeys, wordSlugs) {
	return storyKeys.map((key) => {
		const target = lang.target(key);
		return {
			key,
			audio: key,
			image: key,
			fragments: target.data.map((fragment) => ({
				key: fragment.key,
				time: fragment.time,
				image: fragment.key,
				sentences: fragment.sentences.map((sentence) => ({
					key: sentence.key,
					text: sentence.text,
					time: sentence.time,
					words: sentence.words.map((word) => ({
						key: word.key,
						text: word.text,
						dutch: word.dutch,
						sounds: word.sounds,
						audio: wordSlugs.get(word.text)
					}))
				}))
			}))
		};
	});
}

/** The sound inventory, identical in all four stories, so stored once. */
function buildSounds(lang, storyKeys) {
	const maps = storyKeys.map((key) => lang.target(key).phoneme_srcs);
	const reference = JSON.stringify(maps[0]);
	for (const map of maps.slice(1)) {
		if (JSON.stringify(map) !== reference)
			fail(`${lang.id}: the stories disagree about the sound inventory.`);
	}
	const silent = MISSING_SOUND_RECORDINGS[lang.id];
	for (const sound of silent) {
		if (!(sound in maps[0])) fail(`${lang.id}: "${sound}" is not in the inventory any more.`);
		if (existsSync(lang.path(maps[0][sound])))
			fail(`${lang.id}: "${sound}" has a recording now; drop it from MISSING_SOUND_RECORDINGS.`);
	}
	return Object.keys(maps[0]).map((sound) => ({
		sound,
		...(silent.includes(sound) ? {} : { audio: SOUND_SLUGS[sound] ?? slugify(sound) }),
		// The original never offers G! as a distractor.
		...(sound === 'G!' ? { distractor: false } : {})
	}));
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

async function ffmpeg(input, output, codecArgs) {
	await mkdir(dirname(output), { recursive: true });
	await run('ffmpeg', [
		'-hide_banner',
		'-loglevel',
		'error',
		'-y',
		'-i',
		input,
		...codecArgs,
		output
	]);
}

/**
 * The illustrations are line art. Both sizes are normalised to the 512x512 the
 * source PNGs already use, which is more than the largest card ever renders,
 * and the quality settings were picked as the lowest that stays visually
 * indistinguishable from the source: 8.9 MB of PNG becomes ~1.2 MB and 28 MB of
 * GIF becomes ~7 MB.
 */
const SCALE = ['-vf', 'scale=512:512:flags=lanczos'];

const toWebp = (input, output) =>
	ffmpeg(input, output, [
		...SCALE,
		'-c:v',
		'libwebp',
		'-quality',
		'82',
		'-compression_level',
		'6',
		'-preset',
		'drawing'
	]);

const toAnimatedWebp = (input, output) =>
	ffmpeg(input, output, [
		...SCALE,
		'-c:v',
		'libwebp_anim',
		'-loop',
		'0',
		'-quality',
		'70',
		'-compression_level',
		'6',
		'-preset',
		'drawing'
	]);

/**
 * The sound and word recordings end right on the sound: in most of them less
 * than 0.05 s of quiet follows it, and `b` is still at full volume on its last
 * sample. Some audio outputs lose the last fraction of a second of a clip when
 * it stops - Bluetooth headphones are the usual case - which made `t` silent and
 * cut `b` short. So each clip gets a 15 ms fade-out, which also takes the click
 * off an abrupt end, and 0.25 s of silence after it. They are re-encoded at a
 * higher bit rate than the 64 kbps source, so the extra generation costs
 * nothing audible.
 */
const TAIL_SECONDS = 0.25;

const padRecording = (input, output) =>
	ffmpeg(input, output, [
		'-af',
		`areverse,afade=t=in:d=0.015,areverse,apad=pad_dur=${TAIL_SECONDS}`,
		'-c:a',
		'libmp3lame',
		'-b:a',
		'96k'
	]);

async function copyInto(input, output) {
	await mkdir(dirname(output), { recursive: true });
	await copyFile(input, output);
}

/** Runs tasks with a small amount of concurrency, failing on the first error. */
async function pool(tasks, size = 6) {
	const queue = [...tasks];
	let done = 0;
	const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
		for (let task = queue.shift(); task; task = queue.shift()) {
			await task();
			done += 1;
			if (done % 25 === 0 || done === tasks.length)
				process.stdout.write(`\r    ${done}/${tasks.length}`);
		}
	});
	await Promise.all(workers);
	if (tasks.length) process.stdout.write('\n');
}

async function buildMedia(lang, storyKeys, sounds, wordSlugs) {
	const assets = join(contentDir, lang.id, 'assets');
	await rm(assets, { recursive: true, force: true });

	const tasks = [];
	const missing = [];
	const need = (input) => {
		if (!existsSync(input)) missing.push(input);
		return existsSync(input);
	};

	// Sound recordings.
	const phonemes = lang.target(storyKeys[0]).phoneme_srcs;
	for (const { sound, audio } of sounds) {
		if (!audio) continue;
		const input = lang.path(phonemes[sound]);
		if (need(input))
			tasks.push(() => padRecording(input, join(assets, 'audio/sounds', `${audio}.mp3`)));
	}

	// Single-word recordings, one per distinct spelling.
	for (const [text, slug] of wordSlugs) {
		const input = join(
			lang.source,
			'app/assets/static',
			lang.id,
			'losse_woorden/audio',
			`${text}.mp3`
		);
		if (need(input))
			tasks.push(() => padRecording(input, join(assets, 'audio/words', `${slug}.mp3`)));
	}

	// Story recordings and illustrations.
	for (const key of storyKeys) {
		const target = lang.target(key);
		const recording = lang.path(target.src_wav);
		if (need(recording))
			tasks.push(() => copyInto(recording, join(assets, 'audio/stories', `${key}.mp3`)));

		const images = [
			{ name: key, png: target.src_png, gif: target.src_gif },
			...target.data.map((fragment) => ({
				name: fragment.key,
				png: fragment.src_png,
				gif: fragment.src_gif
			}))
		];
		for (const { name, png, gif } of images) {
			const stillIn = lang.path(png);
			const animIn = lang.path(gif);
			if (need(stillIn))
				tasks.push(() => toWebp(stillIn, join(assets, 'images', key, `${name}.webp`)));
			if (need(animIn))
				tasks.push(() => toAnimatedWebp(animIn, join(assets, 'animations', key, `${name}.webp`)));
		}
	}

	if (missing.length) fail(`${lang.id}: missing source files:\n  ${missing.join('\n  ')}`);

	log(`  converting ${tasks.length} assets`);
	await pool(tasks);
}

/* -------------------------------------------------------------------------- */

async function buildLanguage(language) {
	log(`Reading branch "${LANGUAGES[language].branch}" of ${repository}`);
	const lang = await readLanguage(language);

	const storyKeys = lang.categories.words;
	const categories = buildCategories(lang);
	const sounds = buildSounds(lang, storyKeys);

	// Every distinct spelling in the dataset needs one recording.
	const spellings = new Set();
	for (const key of storyKeys) {
		for (const fragment of lang.target(key).data) {
			for (const sentence of fragment.sentences) {
				for (const word of sentence.words) spellings.add(word.text);
			}
		}
	}
	const wordSlugs = uniqueSlugs(spellings);
	const stories = buildStories(lang, storyKeys, wordSlugs);

	// Sanity checks: every sound used by a word must exist in the inventory.
	const inventory = new Set(sounds.map((s) => s.sound));
	const unknown = new Set();
	for (const story of stories) {
		for (const fragment of story.fragments) {
			for (const sentence of fragment.sentences) {
				for (const word of sentence.words) {
					for (const sound of word.sounds) if (!inventory.has(sound)) unknown.add(sound);
				}
			}
		}
	}
	if (unknown.size)
		fail(`${language}: words use sounds that are not in the inventory: ${[...unknown].join(', ')}`);

	const out = join(contentDir, language);
	await rm(join(out, 'stories'), { recursive: true, force: true });
	await mkdir(join(out, 'stories'), { recursive: true });
	const write = (file, data) => writeFile(join(out, file), `${JSON.stringify(data, null, '\t')}\n`);
	await write('categories.json', categories);
	await write('sounds.json', sounds);
	for (const story of stories) await write(`stories/${story.key}.json`, story);

	log(
		`  ${language}: ${categories.length} categories, ${sounds.length} sounds, ` +
			`${stories.length} stories (${wordSlugs.size} distinct words)`
	);

	if (skipMedia) {
		log('  skipping media conversion (--skip-media)');
	} else {
		log('  converting media');
		await buildMedia(lang, storyKeys, sounds, wordSlugs);
	}
	await rm(lang.source, { recursive: true, force: true });
}

async function main() {
	if (only && !(only in LANGUAGES))
		fail(`Unknown language "${only}". Known: ${Object.keys(LANGUAGES).join(', ')}.`);
	for (const language of only ? [only] : Object.keys(LANGUAGES)) await buildLanguage(language);
	log('Done.');
}

await main();
