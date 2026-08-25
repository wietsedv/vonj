# CLAUDE.md

## What this repository is

A web rewrite of **Van Old noar Jong: Grunnegs**, a Gronings language game for
primary school children. The original native app (NativeScript-Vue, iOS and
Android) is at `../vonj-app` and is read-only reference material: never modify
it.

The rewrite is a SvelteKit app with **no backend**: content is bundled and all
progress lives in the browser's `localStorage`. It is early: the two overview
screens exist as static mock-ups with hardcoded data, and none of the games are
built yet.

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
departs from the original: no backend, and all state in `localStorage`. It wins
wherever it contradicts the `original-app/` documents.

If the `original-app/` docs and `../vonj-app` disagree, the app is the truth. Fix
the docs in the same change.

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
```

Run `npm run format` to fix formatting. Both must pass.

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
  `localStorage`. See `docs/rewrite.md`.
- **`localStorage` is not available during SSR or prerendering.** Anything that
  renders progress is client-only: guard with `browser` from `$app/environment`,
  read after mount, and make sure server-rendered markup is valid without it
  instead of flashing wrong values. Reads and writes can throw in private mode or
  on a full quota, so treat failure as "no progress stored".
