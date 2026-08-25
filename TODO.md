# TODO

Implementation plan for the web rewrite, in the order it makes sense to build.
Background: [`docs/original-app/`](docs/original-app/) for what the original did,
[`docs/rewrite.md`](docs/rewrite.md) for the no-backend / `localStorage`
decisions.

Each phase is meant to end somewhere shippable. Phase 2 delivers one playable
category at a time.

## Phase 0 - Content and state foundations

**Done.** The app runs on the real content set and remembers real progress. The
decisions taken here are written up in [`docs/rewrite.md`](docs/rewrite.md).

- [x] **Bring the content set into this repo.** `scripts/build-content.mjs` reads
      `../vonj-app` and writes `src/lib/content/`: `categories.json`,
      `sounds.json`, and one file per story. The original's English ids became the
      Dutch ones used in the routes and in the storage keys.
- [x] **Trim and convert the assets.** 42 MB of runtime media became 12 MB. The
      `.wav` masters and `.TextGrid` files are gone, the 36 GIFs are animated WebP
      (28 MB to 6.2 MB), the 36 PNGs are WebP (8.9 MB to 0.9 MB), and the 360 MP3s
      are untouched.
- [x] **Decide how assets are served.** Imported through Vite, so every file is
      fingerprinted and cacheable. `src/lib/content/assets.ts` holds URLs only,
      so media is fetched when it is rendered; stories are one dynamic import
      each, so a level pulls in only its own story.
- [x] **Content types and loader.** `src/lib/types.ts` models `Category`,
      `Section`, `Level`, `Story`, `Fragment`, `Sentence`, `Word` and `Sound`;
      `src/lib/content/index.ts` is the typed accessor.
- [x] **`localStorage` wrapper.** `src/lib/storage.ts`. Never throws, validates
      on read, and treats unreadable, unparseable and malformed values alike as
      "nothing stored".
- [x] **Progress model.** One key per level (`luisteren.woorden.bragel`) holding
      the generated items with their response history and the score, plus
      `dataVersion` for content invalidation. No `name` key: the app is anonymous.
- [x] **Progress store.** `src/lib/progress.svelte.ts`, rune-based, with derived
      per-section, per-category and global progress. Empty until `load()` runs on
      mount, so the server-rendered markup never flashes a wrong value.
- [x] **Wire the existing pages to real data.** Both overview screens read
      content and progress. `Score.svelte` gained the half stars the 0-6 scale
      needs, pulled forward from Phase 1 because the overviews show real scores
      now.
- [x] ~~**Onboarding.**~~ Dropped: the app is anonymous and has no name screen.
      See [`docs/rewrite.md`](docs/rewrite.md).

## Phase 1 - Level infrastructure

**Done.** Every level has a URL and opens on the real shell, and the item loop
underneath it is complete. What is missing is the games: a level says
"Onderdeel '<name>' is nog niet geïmplementeerd" where the interaction belongs,
which is Phase 2. The routing and the two deliberate deviations from the original
are written up in [`docs/rewrite.md`](docs/rewrite.md).

A game plugs in by handing `LevelRun` a `generate()` for its items and rendering
its interaction inside `LevelShell`; nothing else about the loop is its business.

- [x] **Level routing.** `src/routes/[category=category]/[section]/[level]/`, so
      `/luisteren/woorden/1` is the level `luisteren.woorden.bragel`. A route
      matcher keeps the category segment to the four real ones, and the load
      function 404s an unknown section or level number. The level cards on the
      category overview are links now, labelled "Level 1" to "Level 4" and still
      never naming the story.
- [x] **Item generation utilities.** `src/lib/game/generate.ts`: shuffle and
      pick, fragment and story distractors drawn from all four stories, sound
      distractors from the inventory minus the ones it never offers, and word
      selection with de-duplication by spelling and the length filters. Not
      seeded, because the items are stored once. `src/lib/game/rules.ts` holds
      the per-section numbers those need: tolerance, difficulty range and start,
      seconds per hint step, and which words a level draws.
- [x] **Level shell.** `LevelShell.svelte`: header with the section name, its
      icon, both description lines and a back button, a snippet for the top area,
      and the numbered progress dots. `FeedbackCard.svelte` is the white card
      both the per-item feedback and the result are built from.
- [x] **Item loop.** `LevelRun` in `src/lib/game/level.svelte.ts`: response
      recording, the completion check, and the difficulty carry-over, up on a
      first-try answer and down otherwise, applied to the next item only.
- [x] **Scoring.** `src/lib/game/score.ts`, with the tolerances in the rules
      table. The 0-6 to half-star mapping was already in `Score.svelte`.
- [x] **Level result screen.** Stars, the animated story illustration, "Terug
      naar het overzicht", and "Dit level nog een keer spelen" for a level that
      was already finished when it was opened.
- [x] **Resume.** Opening a level jumps to the first item not yet answered
      correctly, and a finished level opens straight onto its result.

## Phase 2 - The games

Ordered so each game reuses what the previous one built, rather than
category by category. Lezen comes first because it needs no audio.

- [ ] **Picture-grid component.** Two-column card grid, 4 to 6 options from
      `fragmentDistractors`, red "Helaas!" overlay locking a wrong card.
- [ ] **Lezen > Verhaaltjes.** The simplest game: sentence card plus picture
      grid. Proves out the item loop, difficulty and feedback end to end.
- [ ] **Reorder-list component.** Drag rows into order, submit the whole order,
      per-row check mark or direction arrow, locked given rows. Needs a decision
      on implementation and **must be operable without dragging** (see Open
      questions).
- [ ] **Lezen > Zinnen.** Chunked sentences, the "Resultaat" preview line, the
      free first chunk at low difficulty.
- [ ] **Timer component.** Countdown with total time left plus "mm:ss tot
      volgende hint" / "Tijd is om!".
- [ ] **Lezen > Zinnen met tijdslimiet.** 20 s per row, each expiry locking the
      next row. **Lezen is now complete and playable.**
- [ ] **Audio player component.** Play/pause with progress, loading/ready/
      playing/finished states, and playback restricted to a time range within the
      story recording.
- [ ] **Luisteren > Verhaaltjes.** Whole-story item, one item per fragment over
      two seconds, and the reorder recap. Reuses the grid and the reorder list.
- [ ] **Sound-column component.** One column per sound, a display field that
      replays the chosen sound, and candidate sounds that play when tapped.
- [ ] **Spreken > Korte, Normale and Lange woorden.** Dutch prompt, no audio
      prompt, word-length filter and starting difficulty per section, and the
      answer playback (each chosen sound, then the real recording).
- [ ] **Luisteren > Woorden.** The sound columns again, now with the word
      recording as the prompt and the Dutch translation revealed in the feedback.
- [ ] **Luisteren > Woorden met tijdslimiet.** 15 s per sound, each expiry
      revealing and playing the next sound, auto-submit when all are given.
      **Luisteren and Spreken are now complete.**
- [ ] **Letter-box component.** One single-character input per letter, forward
      focus on input, backward focus on backspace, locked given letters,
      autocorrect and autocapitalisation off.
- [ ] **Schrijven > Woorden.** Masked Gronings sentence and Dutch translation,
      free first letter, one extra letter revealed per wrong attempt, and
      "Jammer!" when a hint completes the word.
- [ ] **Schrijven > Woorden met tijdslimiet.** 20 s per letter, no hint on wrong
      answers, "Volgende" once time is up. **All 44 levels playable.**

## Phase 3 - Behaviour and polish

- [ ] **Reset at all four scopes.** Everything, category, section and level, each
      behind a confirmation. Needs a web gesture (see Open questions).
- [ ] **Demo mode.** Writes nothing to `localStorage` and resets a category when
      it is opened. Needs a trigger first (see Open questions).
- [ ] **Staggered entry and exit animations** on the overview screens and the
      progress dots. The dots are static for now; the original faded them in
      300 ms after the level opened and out again on the way back.
- [ ] **Responsive check.** The level card grids already have `2xs`/`xs`/`sm`
      breakpoints; verify the sound columns and letter boxes on a narrow phone,
      since long words produce many columns and the original scrolled them
      horizontally.
- [ ] **Accessibility.** Keyboard operation for the reorder lists and sound
      columns, focus management in the letter boxes, labels on icon-only buttons,
      and a check that feedback is not conveyed by colour alone.
- [ ] **Offline.** Offline is the only mode, so a service worker is in scope:
      precache the app shell, and cache story media per story on demand rather
      than pushing tens of megabytes on first load.
- [ ] **Deployment.** Replace `adapter-auto` with a concrete adapter, most likely
      static, and set up a build and deploy.

## Open questions

Decisions to make before the tasks that depend on them.

- [ ] **Audio autoplay.** The original starts the recording automatically as soon
      as a level opens. Browsers block audible autoplay without a prior user
      gesture, so on a fresh page load the first play will be refused. Needs a
      deliberate answer: rely on the tap that opened the level, show a prominent
      play state when playback is blocked, or drop autoplay. Blocks the audio
      player.
- [ ] **The volume warning.** "Zet je geluid eerst wat luider" cannot be
      reproduced: the web has no way to read the device volume. Drop it, or
      replace it with a one-off hint.
- [ ] **Long press as the reset gesture.** Long press has no established meaning
      on the web and does not exist for mouse users. Options: keep long press for
      touch and add a right-click or a small overflow menu, or move resetting into
      an explicit control. Blocks the reset work.
- [ ] **Reorder implementation.** Native HTML5 drag and drop is poor on touch,
      which is the primary platform here. Pointer-events based dragging, or a
      library, plus a non-drag fallback such as up/down buttons that also serves
      keyboard users.
- [ ] **Level unlocking.** The original ships with sequential unlocking written
      but disabled, so everything is always playable. Enable it or drop the code
      path. See [`docs/original-app/navigation.md`](docs/original-app/navigation.md).
- [ ] **A demo mode trigger.** Demo mode was entered by typing the name `demo`,
      and there is no name field any more. A query parameter, a build flag, or
      drop the feature.

### Settled

- **Animated illustrations.** Animated WebP, not video: it stays an `<img>`, so
  there is no autoplay policy to work around, and it still cuts 28 MB to 6.2 MB.
- **Multiple pupils per browser.** Accepted as a limitation, as in the original.
  A shared classroom device shares one set of progress, and there are no
  name-scoped keys.
- **Identity.** There is none. No name screen, no greeting by name.
