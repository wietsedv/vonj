# Van Old noar Jong: Grunnegs (web)

A web rewrite of **Van Old noar Jong: Grunnegs**, a language game that teaches
primary school children [Gronings](https://en.wikipedia.org/wiki/Gronings_dialect).
Pupils listen to, read, spell and pronounce four short illustrated Gronings
stories across 44 short levels, and earn stars per level and per category.

The original is a native iOS and Android app built with NativeScript-Vue and
lives in `../vonj-app`. This repository reimplements it as a web app with
SvelteKit, Svelte 5 and Tailwind CSS 4.

There is **no backend**: all content is bundled and all progress is stored in the
browser's `localStorage`.

## Status

All 44 levels are playable. Both overview screens, the level shell and every one
of the seven game types run on the real content set and remember real progress.
What is left is behaviour and polish, not game building.

| Part                                      | State                                            |
| ----------------------------------------- | ------------------------------------------------ |
| Global overview with the four categories  | done, on real progress                           |
| Category overview per category            | done, on real levels and scores                  |
| Levels and games                          | done, all 11 sections and all 44 levels playable |
| Content pipeline (stories, audio, images) | done, generated from `../vonj-app`               |
| Progress persistence in `localStorage`    | done, items and scores per level                 |
| Resetting, demo mode, animations          | not started                                      |
| Accessibility                             | audited and fixed, bar the palette decision      |
| Deployment                                | done, static build on GitHub Pages               |
| Service worker                            | not started                                      |

Each of the eleven sections was played from the first item to the star screen in
Chromium, driven through the UI: 44 levels out of 44 finish and score. The three
timed sections were also left to run their clocks out, a level was resumed part
way through and replayed after finishing, and no console errors appeared
anywhere. [`TODO.md`](TODO.md) has what is left, plus the problems that
playthrough turned up.

## Documentation

[`docs/`](docs/) documents every user-facing feature of the original app as a
functional specification. It is the reference for what this rewrite has to
reproduce: read [`docs/original-app/overview.md`](docs/original-app/overview.md)
first, then [`docs/original-app/games.md`](docs/original-app/games.md) for the
seven game types.

[`docs/rewrite.md`](docs/rewrite.md) records where this version deliberately
differs from the original, and wins wherever the two disagree.

[`TODO.md`](TODO.md) is the implementation plan, in build order.

## Getting started

```sh
npm install
npm run dev          # or: npm run dev -- --open
```

The content set is committed, so there is nothing to generate before the app
runs. Regenerating it needs `../vonj-app` checked out next to this repository.

## Scripts

| Command                          | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| `npm run dev`                    | Start the dev server                             |
| `npm run build`                  | Production build                                 |
| `npm run preview`                | Serve the production build locally               |
| `npm run check`                  | Type-check with `svelte-check`                   |
| `npm run lint`                   | Prettier check plus ESLint                       |
| `npm run format`                 | Format with Prettier                             |
| `npm test`                       | Vitest, both projects (node and real browsers)   |
| `node scripts/build-content.mjs` | Regenerate `src/lib/content/` from `../vonj-app` |

## Tests

`npm test` runs two vitest projects, configured in `vitest.config.ts`:

- **server**, in node (`src/**/*.test.ts`): the content set, the `localStorage`
  wrapper, the progress model, the item generation and scoring, and the
  server-rendered markup.
- **client**, in real browsers through Playwright (`src/**/*.svelte.test.ts`):
  anything that needs layout, rendered SVG or a live `localStorage`, which is
  every game component. The whole suite runs three times over, once in each
  engine: Chromium, Firefox and WebKit, the last standing in for Safari on an
  iPad.

The client project needs the Playwright browser builds once:
`npx playwright install chromium firefox webkit`. Shared helpers live in
`src/tests/`.

## Content

`src/lib/content/` is **generated output**, not source.
`scripts/build-content.mjs` reads the original app's dataset and media out of
`../vonj-app`, converts them, and writes `categories.json`, `sounds.json`,
`stories/*.json` and `assets/` (12 MB: 360 MP3s, 36 animated WebP and 36 still
WebP). Do not hand-edit anything under it; change the script and rerun it. The
app reaches content through `src/lib/content/index.ts` and
`src/lib/content/assets.ts`, never by importing the JSON or the media directly.

## Accessibility

The app was audited in a browser at 320 px, keyboard-only and with
`prefers-reduced-motion`, and what that audit found has been fixed. Every route
has a `<title>`, the document is `lang="nl"` with the Gronings text marked
`lang="gos"`, every screen puts its content in a `<main id="inhoud">` behind a
"Naar de inhoud" skip link, and nothing is conveyed by colour alone to a screen
reader: the score reads as "2,5 van de 3 sterren", a progress dot as "2: fout",
a picture card as "Plaatje 2 van 4", a marked sound field as "Klank oo opnieuw
afspelen, fout". The games are fully operable from the keyboard: the
reordering games have real up/down buttons beside the drag handle and keep focus
on the row that moved, the letter boxes show a focus ring and let a letter be
retyped wherever the caret sits, the sound columns are grouped and named per
position, the feedback card takes focus so its verdict is read out, and the timer
announces its last five seconds and "Tijd is om!" without reading every tick.
Motion is behind `motion-safe:`.

One thing is left, and it is a decision rather than a fix: white text on
`--color-secondary` (3.89:1) and on `--color-accent` (2.84:1) is below the WCAG
AA minimum, and the palette comes from the original app. See "Accessibility" in
[`TODO.md`](TODO.md).

## Deployment

The app is prerendered to static files and published to GitHub Pages at
https://wietsedv.github.io/vonj/ by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), on every push to
`main`. The workflow runs `check`, `lint` and `test` before it builds, so a
failing check never reaches the site.

Pages needs one manual setting the first time: **Settings → Pages → Source →
GitHub Actions**.

`export const prerender = true` on the root layout turns the whole app into
files: the 44 level pages are found by crawling the links on the category
pages, and `404.html` is the fallback GitHub Pages serves for anything else, so
an unknown URL gets the app's own error page rather than GitHub's.

A project site lives under `/<repo>`, so the workflow builds with `BASE_PATH`
set to the base path Pages reports. Locally it is empty and the app sits at the
root. This is why internal links go through `resolve()` from `$app/paths` and
media through `src/lib/content/assets.ts`: both come out right under either
prefix.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) 2 with Svelte 5 runes
- [Tailwind CSS](https://tailwindcss.com) 4, configured in `src/app.css`
- TypeScript, ESLint and Prettier
- Vitest with `@vitest/browser` and Playwright
- `@sveltejs/adapter-static`, deployed to GitHub Pages

## Layout

```
src/
├── app.css                     Tailwind entry point and theme tokens
├── app.html
├── lib/
│   ├── components/
│   │   ├── games/              One component per section, plus their shared parts
│   │   ├── level/              The level shell and its reusable pieces
│   │   └── *.svelte            Overview UI (CategoryPage, SubcategorySection, Score)
│   ├── content/                Generated content set and its typed accessors
│   ├── game/                   Item generation, rules, the item loop, scoring, audio, timers
│   ├── icons/                  Inline SVG icon components
│   ├── progress.svelte.ts      The progress store, one localStorage key per level
│   ├── storage.ts              localStorage wrapper that never throws
│   └── types.ts                Shared types
├── params/                     Route matcher for the four categories
├── routes/
│   ├── +page.svelte            Global overview
│   ├── (categories)/           luisteren, lezen, schrijven, spreken
│   └── [category=category]/[section]/[level]/   One playable level
└── tests/                      Fixtures and the score-icon recogniser
docs/                           Feature documentation of the original app
scripts/build-content.mjs       Content and asset pipeline
```

## Theme

The palette lives in `src/app.css` as Tailwind theme tokens:

| Token               | Value     | Use                                  |
| ------------------- | --------- | ------------------------------------ |
| `--color-primary`   | `#e31414` | Headers                              |
| `--color-secondary` | `#0087d2` | Page background                      |
| `--color-accent`    | `#0fb215` | Stars, confirmation, primary actions |

These come from the original app, and so does the favicon
(`src/lib/assets/favicon.png`, its Android launcher icon). White text on
`secondary` (3.89:1) and on `accent` (2.84:1) is below the WCAG AA minimum for
body text, which is why contrast is still open in the accessibility list.

Three extra breakpoints (`2xs`, `xs`, `sm`) exist for the level card grids, which
have to stay usable on narrow phones.
