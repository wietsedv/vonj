# Documentation

This repository is a web rewrite of **Van Old noar Jong: Grunnegs**, a native
NativeScript-Vue app for iOS and Android. The original app lives in
[`../vonj-app`](../../vonj-app) and is not part of this repository.

## Decisions for this rewrite

[**rewrite.md**](rewrite.md) records where the web app deliberately differs from
the original: no backend, and all state in `localStorage`. Read it alongside the
reference documentation below, and treat it as the winner wherever the two
disagree.

## Reference documentation for the original app

The `original-app/` folder documents every user-facing feature of the native app.
It is written as a functional specification, not as a description of the old
codebase: it is the source of truth for what the web version has to reproduce,
except where [rewrite.md](rewrite.md) overrides it.

| Document                                              | Contents                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Overview](original-app/overview.md)                  | What the app is, who it is for, the four categories, the whole flow at a glance          |
| [Onboarding](original-app/onboarding.md)              | School and name entry, the school picker, demo mode                                      |
| [Navigation and progress](original-app/navigation.md) | Global overview, category overview, level unlocking, reset gestures                      |
| [Level shell](original-app/level-shell.md)            | The chrome shared by all games: header, progress dots, feedback card, replay             |
| [Games](original-app/games.md)                        | All seven playable game types in detail, including hints, timers and adaptive difficulty |
| [Scoring](original-app/scoring.md)                    | How mistakes turn into a 0-6 score and into stars                                        |
| [Content](original-app/content.md)                    | The Gronings content set: stories, fragments, words, sounds, images, audio               |
| [Data and persistence](original-app/data.md)          | API endpoints, offline dataset, local progress storage, answer submission                |

## Conventions used in these documents

- All user-visible strings are quoted verbatim in Dutch, as the original app
  shows them. They are the actual copy, not a translation.
- "Story" refers to one of the four content units (`bragel`, `kopstubber`,
  `scheuvels`, `zoepenbrij`). The original code calls these `word` or `target`.
- "Fragment" refers to one illustrated part of a story (8 per story).
- "Sound" (Dutch: _klank_) refers to one phoneme-like unit of Gronings
  spelling, for example `aa`, `ng`, `ie`.
- Behaviour that exists in the original code but is switched off is marked as
  **disabled in the original**, so the rewrite can make a deliberate choice.
