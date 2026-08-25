# TODO

Implementation plan for the web rewrite, in the order it makes sense to build.
Background: [`docs/original-app/`](docs/original-app/) for what the original did,
[`docs/rewrite.md`](docs/rewrite.md) for the no-backend / `localStorage`
decisions.

Each phase is meant to end somewhere shippable. Phase 2 delivers one playable
category at a time.

## Phase 0 - Content and state foundations

Nothing else can be real until the app has real data. Everything currently on
screen is hardcoded.

- [ ] **Bring the content set into this repo.** Copy the Gronings dataset out of
      `../vonj-app/app/assets/static/gronings/` and the structure out of
      `../vonj-app/app/lib/offline.ts`, and turn `offline.ts` into plain JSON
      (categories, and one file per story).
- [ ] **Trim and convert the assets.** The raw set is 66 MB; the runtime set is
      about 42 MB and can be much smaller:
  - drop the `.wav` masters (24 MB) and the Praat `.TextGrid` files (1.3 MB),
    which the app never loads;
  - the 36 animated GIFs are 28 MB, roughly 780 KB each. Convert them to
    `mp4`/`webm` and play them muted, looping and inline, or to animated WebP.
    This is the single biggest win available;
  - re-encode the 36 PNGs (8.9 MB) as WebP with PNG fallback if needed;
  - keep the 392 MP3s (5.3 MB) as they are.
- [ ] **Decide how assets are served.** Bundled through Vite (hashed, imported)
      versus placed in `static/` and referenced by path. Story media is large and
      per-story, so lazy loading per story matters either way.
- [ ] **Content types and loader.** Model `Category`, `Section`, `Level`, `Story`,
      `Fragment`, `Sentence`, `Word` and the sound inventory in `src/lib`, and
      expose a typed accessor. Extend `src/lib/types.ts`, which currently only
      holds the `Category` union.
- [ ] **`localStorage` wrapper.** Safe read/write that never throws (private
      mode, full quota), JSON encode/decode, and discards malformed values. See
      [`docs/rewrite.md`](docs/rewrite.md).
- [ ] **Progress model.** One key per level (`listen.words.bragel`) holding the
      generated items with their response history and the score, plus `name` and
      `dataVersion`. Include content-version invalidation from the start: it is
      cheap now and painful to retrofit.
- [ ] **Progress store.** A Svelte 5 rune-based store over the above, with
      derived per-section, per-category and global progress. Must be safe to read
      during SSR: guard with `browser` from `$app/environment` and hydrate after
      mount, so server-rendered markup does not flash wrong stars.
- [ ] **Wire the existing pages to real data.** Replace the hardcoded arrays in
      `src/routes/+page.svelte` and `src/lib/components/SubcategorySection.svelte`
      with content plus progress. First point where the app does something true.
- [ ] **Onboarding.** Name-only screen (no school picker, see
      [`docs/rewrite.md`](docs/rewrite.md)), storing the name, greeting the pupil
      on the overview, and redirecting there when no name is stored.

## Phase 1 - Level infrastructure

Shared by all seven games, so worth getting right once.

- [ ] **Level routing.** A route that identifies category, section and level, and
      resolves to the right game. Levels are labelled "Level 1" to "Level 4" and
      must not leak the story name.
- [ ] **Item generation utilities.** Seeded-free is fine here since items are
      stored once: shuffle, picture distractors from other stories, sound
      distractors from the inventory, word extraction with de-duplication by
      spelling, and the word-length filters the Spreken sections use.
- [ ] **Level shell.** Header with section name, icon and full description; a
      slot for the top area; the numbered progress dots with their
      current/correct/wrong states; the per-item feedback card. See
      [`docs/original-app/level-shell.md`](docs/original-app/level-shell.md).
- [ ] **Item loop.** Response recording, completion check, and the adaptive
      difficulty carry-over (up on first-try correct, down otherwise, applied to
      the next item only).
- [ ] **Scoring.** The `6 - (mistakes / (items * tolerance)) * 6` formula with
      per-game tolerances, and the 0-6 to half-star mapping. The existing
      `Score.svelte` renders three states only and needs half stars added. See
      [`docs/original-app/scoring.md`](docs/original-app/scoring.md).
- [ ] **Level result screen.** Stars, the animated story illustration, "Terug
      naar het overzicht", and "Dit level nog een keer spelen" for a level that
      was already finished when opened.
- [ ] **Resume.** On opening a level, jump to the first item not yet answered
      correctly; open a finished level straight onto its result.

## Phase 2 - The games

Ordered so each game reuses what the previous one built, rather than
category by category. Lezen comes first because it needs no audio.

- [ ] **Picture-grid component.** Two-column card grid, 4 to 6 options, red
      "Helaas!" overlay locking a wrong card.
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
- [ ] **Demo mode.** The name `demo` writes nothing to `localStorage`, greets
      without a name, and resets a category when it is opened.
- [ ] **Staggered entry and exit animations** on the overview screens and the
      progress dots.
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
- [ ] **Animated illustrations.** Keep GIF, or convert to muted looping video and
      accept the extra complexity for roughly a 90% size cut.
- [ ] **Level unlocking.** The original ships with sequential unlocking written
      but disabled, so everything is always playable. Enable it or drop the code
      path. See [`docs/original-app/navigation.md`](docs/original-app/navigation.md).
- [ ] **Multiple pupils per browser.** `localStorage` is per browser profile, so
      a shared classroom device shares one set of progress. The original had the
      same limitation. Accept it, or add name-scoped keys.
