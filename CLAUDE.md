# CLAUDE.md

## What this repository is

A web rewrite of **Van Old noar Jong: Grunnegs**, a Gronings language game for
primary school children. The original native app (NativeScript-Vue, iOS and
Android) is at `../vonj-app` and is read-only reference material: never modify
it.

The rewrite is a SvelteKit app with **no backend** and **no identity**: content
is bundled, all progress lives in the browser's `localStorage`, and the app never
asks who is playing. It is early: the two overview screens run on the real
content set and real progress, but none of the games are built yet. See
[`TODO.md`](TODO.md) for where things stand.

## Read the docs before implementing a feature

[`docs/original-app/`](docs/original-app/) is a functional specification of every
user-facing feature of the original app. When implementing anything that existed
in the original, read the relevant document first rather than reverse
engineering the Vue source:

- `overview.md` - the app, the four categories, the whole flow
- `onboarding.md` - school and name entry, demo mode
- `navigation.md` - overview screens, unlocking, reset gestures
- `level-shell.md` - the chrome every game shares
- `games.md` - all seven game types, hints, timers, adaptive difficulty
- `scoring.md` - the 0-6 score and the star mapping
- `content.md` - stories, fragments, words, sounds
- `data.md` - API, offline data, local persistence

[`docs/rewrite.md`](docs/rewrite.md) records where this version deliberately
departs from the original: no backend, no identity, all state in `localStorage`,
and how the content set is generated. It wins wherever it contradicts the
`original-app/` documents.

If the `original-app/` docs and `../vonj-app` disagree, the app is the truth. Fix
the docs in the same change.

## The content set is generated

`src/lib/content/` is **generated output**, not source. `scripts/build-content.mjs`
reads the original app's dataset and media out of `../vonj-app`, converts them,
and writes `categories.json`, `sounds.json`, `stories/*.json` and `assets/`.

- Do not hand-edit anything under `src/lib/content/`, `assets/` included. Change
  the script and run `node scripts/build-content.mjs`.
- The script only ever reads from `../vonj-app`.
- Content is reached through `src/lib/content/index.ts` and
  `src/lib/content/assets.ts`, never by importing the JSON or the media directly.
  Stories are loaded with `loadStory()`, which is async because each story is its
  own chunk.
- Bump `dataVersion` in `src/lib/content/version.ts` when a content change can
  invalidate stored items. Regenerating alone does not bump it.

## Ids

One vocabulary, Dutch, everywhere: in the content data, in the routes and in the
`localStorage` keys. `luisteren.woorden.bragel` is the level reached at
`/luisteren/woorden/...`. The original app's English ids (`listen`, `words`) exist
only inside the build script, which translates them.

## Stack and conventions

- **SvelteKit 2 with Svelte 5 runes.** Use `$props()`, `$state()`, `$derived()`.
  No Svelte 4 `export let` or stores unless there is a reason.
- **Tailwind CSS 4**, configured entirely in `src/app.css` via `@theme`. There is
  no `tailwind.config.js`. Style with utility classes; reach for a `<style>` block
  only for things utilities cannot express.
- **TypeScript everywhere**, including `<script lang="ts">`.
- **Routing**: `src/routes/(categories)/<category>/` holds one page per category,
  named in Dutch (`luisteren`, `lezen`, `schrijven`, `spreken`), matching the
  `Category` type in `src/lib/types.ts`. Use `resolve()` from `$app/paths` for
  internal links, not raw strings.
- **Icons** are inline Svelte SVG components in `src/lib/icons/`, coloured with
  Tailwind through `[&>svg]:fill-*`. Add new ones the same way rather than
  pulling in an icon library.
- **Package manager**: npm (`package-lock.json`). The original app used bun; do
  not reintroduce bun here.

## Language

- All user-facing copy is **Dutch**, and where it existed in the original it is
  quoted verbatim in the docs. Reuse that copy exactly instead of writing new
  Dutch.
- Code, comments, commit messages and documentation are in English.
- The content being taught is Gronings. Gronings words, sentences and the
  spelling of sounds come from the content data and are never invented or
  corrected.

## Before finishing a change

```sh
npm run check    # svelte-check
npm run lint     # prettier --check plus eslint
npm test         # vitest
```

Run `npm run format` to fix formatting. All three must pass.

## Tests

`npm test` runs two vitest projects, configured in `vitest.config.ts`:

- **server**, in node: the content set, the `localStorage` wrapper, the progress
  model and the server-rendered markup (`src/**/*.test.ts`).
- **client**, in a real Chromium through Playwright: anything that needs layout,
  rendered SVG or a live `localStorage` (`src/**/*.svelte.test.ts`).

Shared helpers live in `src/tests/`: `fixtures.ts` builds `StoredLevel` values,
and `icons.ts` recognises the score icons by their geometry, so a suite can
assert `"full full half"` against the table in `docs/original-app/scoring.md`
without hardcoding path data.

Two things to know when writing more:

- `progress` is a module singleton with a one-shot `load()`. In node, take a
  fresh copy per test with `vi.resetModules()`; in the browser project that does
  not work, so `load()` once and drive the store with `save()` and
  `resetEverything()`.
- The browser project needs the Playwright Chromium build
  (`npx playwright install chromium`).

## Things to be careful about

- **Do not invent game mechanics.** The original has specific behaviour for
  hints, timers, adaptive difficulty and scoring. It is documented; follow it.
- **Do not invent Dutch UI copy** where the original had a string for it.
- **Content is data, not code.** Categories, sections, levels, stories and
  sounds all come from a dataset. Do not hardcode story or word content in
  components; the current hardcoded values in the mock-up pages are placeholders
  to be replaced by data.
- **There is no backend.** Do not add API calls, server routes or a database.
  Content is bundled; progress is client-side only. The original's `POST /submit`
  teacher reporting is deliberately gone.
- **Progress persistence stores generated items, not just scores**, so a level
  replays identically and can be resumed mid-item. Keyed per level in
  `localStorage`. Go through `src/lib/progress.svelte.ts` and
  `src/lib/storage.ts` rather than touching `localStorage` directly. See
  `docs/rewrite.md`.
- **`localStorage` is not available during SSR or prerendering.** Anything that
  renders progress is client-only: guard with `browser` from `$app/environment`,
  read after mount, and make sure server-rendered markup is valid without it
  instead of flashing wrong values. Reads and writes can throw in private mode or
  on a full quota, so treat failure as "no progress stored".
