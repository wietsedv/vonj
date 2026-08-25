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

Early. The static screens are in place; the games are not built yet.

| Part                                      | State                                       |
| ----------------------------------------- | ------------------------------------------- |
| Global overview with the four categories  | static mock-up, hardcoded progress          |
| Category overview per category            | static mock-up, hardcoded levels and scores |
| Levels and games                          | not started                                 |
| Content pipeline (stories, audio, images) | not started                                 |
| Progress persistence in `localStorage`    | not started                                 |

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

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the dev server               |
| `npm run build`   | Production build                   |
| `npm run preview` | Serve the production build locally |
| `npm run check`   | Type-check with `svelte-check`     |
| `npm run lint`    | Prettier check plus ESLint         |
| `npm run format`  | Format with Prettier               |

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) 2 with Svelte 5 runes
- [Tailwind CSS](https://tailwindcss.com) 4, configured in `src/app.css`
- TypeScript, ESLint and Prettier
- `@sveltejs/adapter-auto`, so a deployment target still has to be chosen. With
  no backend, a static adapter is the likely end state.

## Layout

```
src/
├── app.css                     Tailwind entry point and theme tokens
├── lib/
│   ├── components/             Shared UI (CategoryHeader, SubcategorySection, Score)
│   ├── icons/                  Inline SVG icon components
│   └── types.ts                Shared types
└── routes/
    ├── +layout.svelte
    ├── +page.svelte            Global overview
    └── (categories)/           luisteren, lezen, schrijven, spreken
docs/                           Feature documentation of the original app
```

## Theme

The palette lives in `src/app.css` as Tailwind theme tokens:

| Token               | Value     | Use                                  |
| ------------------- | --------- | ------------------------------------ |
| `--color-primary`   | `#e31414` | Headers                              |
| `--color-secondary` | `#0087d2` | Page background                      |
| `--color-accent`    | `#0fb215` | Stars, confirmation, primary actions |

Three extra breakpoints (`2xs`, `xs`, `sm`) exist for the level card grids, which
have to stay usable on narrow phones.
