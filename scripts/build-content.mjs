/**
 * Regenerates src/lib/content from the original app's bundled dataset.
 *
 *   node scripts/build-content.mjs [--source ../vonj-app] [--skip-media]
 *
 * The original app is read-only reference material: this script only reads from
 * it. It rewrites src/lib/content/*.json and src/lib/content/assets/** in place.
 *
 * Media conversion needs ffmpeg with libwebp and libwebp_anim.
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
const source = resolve(repo, flag('source', '../vonj-app'));
const skipMedia = args.includes('--skip-media');

const out = join(repo, 'src/lib/content');
const assets = join(out, 'assets');
const gronings = join(source, 'app/assets/static/gronings');

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
 * Typos in the original's Dutch copy, corrected on the way through. Keyed by the
 * whole original line, so a fix that lands upstream stops being applied here
 * instead of being applied twice, and an unused entry is reported.
 *
 * This is the only place where the app's Dutch differs from the original's; the
 * Gronings content itself is never corrected.
 */
const COPY_FIXES = {
	'Sleep te zinnen in de juiste volgorde om het verhaaltje leesbaar te maken.':
		'Sleep de zinnen in de juiste volgorde om het verhaaltje leesbaar te maken.'
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
 * offline.ts is a TypeScript module holding one object literal. Stripping the
 * single type annotation makes it valid ESM, which node can import directly.
 */
async function readOffline() {
	const file = join(source, 'app/lib/offline.ts');
	if (!existsSync(file))
		fail(`Original dataset not found at ${file}\nPass --source <path to vonj-app>.`);
	const ts = await readFile(file, 'utf8');
	const js = ts.replace('const root: { [key: string]: object } = {', 'const root = {');
	if (js === ts) fail('Could not strip the type annotation from offline.ts; its shape changed.');
	const tmp = join(repo, 'node_modules/.cache/vonj-offline.mjs');
	await mkdir(dirname(tmp), { recursive: true });
	await writeFile(tmp, js);
	const { default: root } = await import(`${tmp}?t=${Date.now()}`);
	await rm(tmp, { force: true });
	return root;
}

/** "~/assets/static/gronings/klanken/audio/aa.mp3" -> absolute path. */
const sourcePath = (src) => join(source, 'app', src.replace(/^~\//, ''));

/** Fold a Gronings word to an ASCII path segment: "bèr" -> "ber". */
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

function buildCategories(root) {
	const source = root['/categories/demo'];
	if (!source) fail('offline.ts has no "/categories/demo" entry.');

	const applied = new Set();
	const fix = (line) => {
		const fixed = COPY_FIXES[line];
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

	for (const line of Object.keys(COPY_FIXES)) {
		if (!applied.has(line)) {
			console.warn(`  note: copy fix no longer matches anything, drop it:\n    "${line}"`);
		}
	}

	return categories;
}

function buildStories(root, storyKeys, wordSlugs) {
	return storyKeys.map((key) => {
		const target = root[`/target/gronings/${key}`];
		if (!target) fail(`offline.ts has no story "${key}".`);
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
function buildSounds(root, storyKeys) {
	const maps = storyKeys.map((key) => root[`/target/gronings/${key}`].phoneme_srcs);
	const reference = JSON.stringify(maps[0]);
	for (const map of maps.slice(1)) {
		if (JSON.stringify(map) !== reference) fail('The stories disagree about the sound inventory.');
	}
	return Object.keys(maps[0]).map((sound) => ({
		sound,
		audio: SOUND_SLUGS[sound] ?? slugify(sound),
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

async function buildMedia(root, storyKeys, sounds, wordSlugs) {
	await rm(assets, { recursive: true, force: true });

	const tasks = [];
	const missing = [];
	const need = (input) => {
		if (!existsSync(input)) missing.push(input);
		return existsSync(input);
	};

	// Sound recordings.
	const phonemes = root[`/target/gronings/${storyKeys[0]}`].phoneme_srcs;
	for (const { sound, audio } of sounds) {
		const input = sourcePath(phonemes[sound]);
		if (need(input))
			tasks.push(() => copyInto(input, join(assets, 'audio/sounds', `${audio}.mp3`)));
	}

	// Single-word recordings, one per distinct spelling.
	for (const [text, slug] of wordSlugs) {
		const input = join(gronings, 'losse_woorden/audio', `${text}.mp3`);
		if (need(input)) tasks.push(() => copyInto(input, join(assets, 'audio/words', `${slug}.mp3`)));
	}

	// Story recordings and illustrations.
	for (const key of storyKeys) {
		const target = root[`/target/gronings/${key}`];
		const recording = sourcePath(target.src_wav);
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
			const stillIn = sourcePath(png);
			const animIn = sourcePath(gif);
			if (need(stillIn))
				tasks.push(() => toWebp(stillIn, join(assets, 'images', key, `${name}.webp`)));
			if (need(animIn))
				tasks.push(() => toAnimatedWebp(animIn, join(assets, 'animations', key, `${name}.webp`)));
		}
	}

	if (missing.length) fail(`Missing source files:\n  ${missing.join('\n  ')}`);

	log(`  converting ${tasks.length} assets`);
	await pool(tasks);
}

/* -------------------------------------------------------------------------- */

async function main() {
	log(`Reading ${join(source, 'app/lib/offline.ts')}`);
	const root = await readOffline();

	const storyKeys = root['/categories/demo'].words;
	const categories = buildCategories(root);
	const sounds = buildSounds(root, storyKeys);

	// Every distinct Gronings spelling in the dataset needs one recording.
	const spellings = new Set();
	for (const key of storyKeys) {
		for (const fragment of root[`/target/gronings/${key}`].data) {
			for (const sentence of fragment.sentences) {
				for (const word of sentence.words) spellings.add(word.text);
			}
		}
	}
	const wordSlugs = uniqueSlugs(spellings);
	const stories = buildStories(root, storyKeys, wordSlugs);

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
		fail(`Words use sounds that are not in the inventory: ${[...unknown].join(', ')}`);

	await mkdir(join(out, 'stories'), { recursive: true });
	const write = (file, data) => writeFile(join(out, file), `${JSON.stringify(data, null, '\t')}\n`);
	await write('categories.json', categories);
	await write('sounds.json', sounds);
	for (const story of stories) await write(`stories/${story.key}.json`, story);

	log(
		`Wrote ${categories.length} categories, ${sounds.length} sounds, ${stories.length} stories ` +
			`(${wordSlugs.size} distinct words)`
	);

	if (skipMedia) {
		log('Skipping media conversion (--skip-media).');
		return;
	}
	log('Converting media');
	await buildMedia(root, storyKeys, sounds, wordSlugs);
	log('Done.');
}

await main();
