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
underneath it is complete. While this phase was the newest, a level said
"Onderdeel '<name>' is nog niet geïmplementeerd" where the interaction belongs;
Phase 2 filled every one of those in and the placeholder is gone. The routing and
the two deliberate deviations from the original are written up in
[`docs/rewrite.md`](docs/rewrite.md).

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
category by category. Lezen came first because it needs no audio.

**Done. All 44 levels are playable.** Every one of the eleven sections has a
game: a component under `src/lib/components/games/`, registered by section in
`games/index.ts`, which `games.test.ts` holds to the rules table so a new
section cannot arrive without an implementation. The three Spreken sections
share one component, because they differ only in the rules their section id
already carries.

Four decisions taken here are written up in [`docs/rewrite.md`](docs/rewrite.md):
reordering is dragged **or** buttoned, autoplay degrades to a play button, the
volume warning is gone, and the native alert dialogs became inline messages.

Building the games also turned up six places where
[`docs/original-app/`](docs/original-app/) did not match `../vonj-app`. Per
[`CLAUDE.md`](CLAUDE.md) the app is the truth, so the code follows the app and
the docs were corrected in the same change: the free head start in Lezen >
Zinnen is two chunks at difficulty -1 rather than one, the sentence chunking
drops a fragment's leftover of fewer than three chunks, the three timed sections
disagree about whether an expiry costs score, and the Luisteren recap gives its
first tile away, uses every fragment, plays the whole recording and still shows
the story's animation.

- [x] **Picture-grid component.** `PictureGrid.svelte`: two-column card grid, 4 to
      6 options from `fragmentDistractors`, red "Helaas!" overlay locking a wrong
      card. `ItemFeedback.svelte` came with it: the per-item feedback card plus
      "Doorgaan", which every game needs.
- [x] **Lezen > Verhaaltjes.** Sentence card plus picture grid, and the item loop,
      the difficulty and the feedback proven end to end. The shared parts of both
      picture games live in `src/lib/game/pictures.ts`: the items of a story, the
      option count per difficulty and the fixed option order (see
      [`docs/rewrite.md`](docs/rewrite.md)).
- [x] **Reorder-list component.** `ReorderList.svelte`: a pointer-events drag on
      the handle plus a visible up/down button per row, so the ordering games are
      operable without dragging and from the keyboard. Locked rows are held out
      of the movable subsequence, so a given row cannot be dragged through.
- [x] **Lezen > Zinnen.** Chunked sentences, the "Resultaat" preview line, and
      the free head start at low difficulty. `src/lib/game/sentences.ts` holds
      the chunking, the starting order, the head start and the row markers.
- [x] **Timer component.** `Countdown` in `src/lib/game/timer.svelte.ts` plus
      `Timer.svelte`: total time left, "mm:ss tot volgende hint" and "Tijd is
      om!". The remaining time is derived from a captured deadline rather than a
      tick count, so a backgrounded tab does not drift.
- [x] **Lezen > Zinnen met tijdslimiet.** 20 s per row, each expiry locking the
      next row of the correct order. **Lezen is complete and playable.**
- [x] **Audio player component.** `AudioPlayer.svelte` over
      `src/lib/game/audio.ts`: the four states, playback restricted to a time
      range within the story recording with the progress bar scaled to it, and
      cancellable sequential playback for the sound games.
- [x] **Luisteren > Verhaaltjes.** Whole-story item, one item per fragment, and
      the reorder recap. Reuses the picture grid, the reorder list and the
      generic reorder helpers of `sentences.ts`.
- [x] **Sound-column component.** `SoundColumns.svelte` with `SoundField.svelte`:
      one column per sound, a display field that replays the chosen sound, and
      candidates that the game plays when they are tapped. Ten columns scroll
      horizontally without the page scrolling with them.
- [x] **Spreken > Korte, Normale and Lange woorden.** One component for all
      three: the Dutch prompt, no audio prompt, the word-length filter and
      starting difficulty from the section's rules, and the answer playback.
- [x] **Luisteren > Woorden.** The sound columns again, with the word recording
      as the prompt and the Dutch translation revealed in the feedback.
- [x] **Luisteren > Woorden met tijdslimiet.** 15 s per sound, each expiry
      revealing and playing the next one, and auto-submit when the last is given
      away. The one timed section where the clock costs score, so it is also the
      one that can recover its given-away sounds on resume.
      **Luisteren and Spreken are complete.**
- [x] **Letter-box component.** `LetterBoxes.svelte`: one single-character input
      per letter, forward focus on input and backward on backspace, both skipping
      locked boxes, autocorrect and autocapitalisation off, and a read-only mode
      for the feedback card.
- [x] **Schrijven > Woorden.** Masked Gronings sentence and Dutch translation,
      free first letter, one extra letter revealed per wrong attempt, and
      "Jammer!" when a hint completes the word.
- [x] **Schrijven > Woorden met tijdslimiet.** 20 s per letter, no hint on wrong
      answers, "Volgende" once time is up. **All 44 levels playable.**

**Verified by playing them.** Every section was played from its first item to
its star screen in Chromium, driven through the UI (clicks, typing and the
up/down buttons only, with the correct answer read out of the stored items):
all 44 levels finish and score, with no console errors. The three timed
sections were also left to run their clocks out, which confirmed the table in
`docs/original-app/games.md`: an expiry in Luisteren > Woorden records a
response and costs score, the other two hand rows and letters over for free,
Lezen keeps "Versturen" while Schrijven switches to "Volgende", and the
feedback still reads "Jammer!". A level resumed part way through came back with
the same items on the same dot, and a finished level reopened on its result and
regenerated fresh items on "Dit level nog een keer spelen". The writing games'
hint chain was checked separately: one letter per wrong attempt, and a hint that
completes the word records the completed answer as an extra response and says
"Jammer!". That playthrough turned up one real bug and a list of accessibility
problems, both below.

## Phase 3 - Behaviour and polish

- [ ] **Reset at all four scopes.** Everything, category, section and level, each
      behind a confirmation. Needs a web gesture (see Open questions).
- [ ] **Demo mode.** Writes nothing to `localStorage` and resets a category when
      it is opened. Needs a trigger first (see Open questions).
- [ ] **Staggered entry and exit animations** on the overview screens and the
      progress dots. The dots are static for now; the original faded them in
      300 ms after the level opened and out again on the way back.
- [ ] **Responsive check.** Largely done and measured at 320 px: no screen
      scrolls the page horizontally, a ten-sound word scrolls inside its own
      column strip (524 px of columns in a 288 px strip) and the letter boxes
      wrap onto extra rows. What is left is a look at the level card grids and
      the overview screens on a real narrow phone, and at the sound columns in
      landscape.
- [x] **Accessibility.** Audited in a browser at 320 px, keyboard-only and with
      `prefers-reduced-motion`, and the problems that audit found are fixed.
      What already worked: the reordering games have real up/down buttons beside
      the drag handle, the letter boxes are labelled per box and set
      `aria-invalid` on a wrong letter, a wrong picture card says "Helaas!"
      instead of only turning red, the inline messages are `role="alert"`, the
      sound candidates expose `aria-pressed`, and every touch target is at least
      24 px. What was fixed:

      - **Page titles.** `src/lib/title.ts` builds them and every route sets one:
        the app on the global overview, "Luisteren - ..." on a category, and
        "Level 2 - Woorden - Luisteren - ..." on a level, which still never names
        the story behind it.
      - **`<html lang="nl">`** in `src/app.html`, and the Gronings text carries
        `lang="gos"`: the sentence card, the sentence rows, the "Grunnegs" half
        of the writing prompt and the letter boxes.
      - **The picture cards have a name.** "Plaatje 2 van 4", and ", helaas,
        fout" once a card has been tapped and locked, so the overlay is not the
        only sign.
      - **The score reads as a score.** `Score.svelte` is one `role="img"` with
        "2,5 van de 3 sterren", or "Nog niet gespeeld". It claims nothing at all
        while progress is still unknown.
      - **The progress dots spell their state out**, as "1: goed", "2: fout",
        "3: nu bezig" and "4: nog niet gedaan", and the strip is labelled
        "Voortgang in dit level".
      - **A marked sound field says which it is.** Its name gains ", goed" or
        ", fout", the way the letter boxes already did it.
      - **The letter boxes show focus.** The ring is on the box rather than on
        the input inside it, so the whole bordered square lights up.
      - **Focus survives a reorder.** The moved row keeps it: the button that was
        pressed, or the other button of the same row when the move disabled it.
      - **The drag handle is out of the tab order** and out of the accessibility
        tree, since it only ever listened for a pointer and the up/down buttons
        are the keyboard path.
      - **The feedback card takes focus** on its heading, so "Dat klopt!" or
        "Jammer!" is read out and "Doorgaan" is one Tab away. The timer announces
        the two moments that matter, the last five seconds and "Tijd is om!", and
        stays silent for every tick in between.
      - **The sound columns are grouped.** One `role="group"` per column, named
        "Klank 3 van 6", so a candidate has a column to belong to and the
        position is announced even while the display field is still empty.
      - **The timer's pulse respects `prefers-reduced-motion`**, through
        `motion-safe:animate-pulse`.
      - **`<main id="inhoud">` on every screen**, and a "Naar de inhoud" skip
        link in the layout as the first thing in the tab order.
      - **The reorder instruction mentions the buttons.** The original's line,
        verbatim, and then "Of gebruik de pijltjes om een item omhoog of omlaag
        te zetten."

      Two things the audit turned up are decisions rather than fixes, and are
      still open:

      - [ ] **Contrast below AA.** White on `--color-secondary` is 3.89:1 and
            white on `--color-accent` 2.84:1, so "Versturen", "Doorgaan", the
            current progress dot and a chosen sound candidate all miss the 4.5:1
            body-text minimum; `text-primary` on `bg-primary/10` in the inline
            alerts is 4.07:1. The palette comes from the original app, so this is
            a decision to take rather than a typo: darken those two where they
            carry text, or use dark text on them.
      - [ ] **A finished dot still differs from a wrong one by colour alone**
            when it is looked at rather than listened to. Both carry their
            number, and now their state in words, but green against red is the
            only thing an eye has to go on. Waiting on the palette decision
            above.

- [ ] **Offline.** Offline is the only mode, so a service worker is in scope:
      precache the app shell, and cache story media per story on demand rather
      than pushing tens of megabytes on first load.
- [ ] **Deployment.** Replace `adapter-auto` with a concrete adapter, most likely
      static, and set up a build and deploy.

## Known problems

**None open.** The two that playing the games turned up are fixed.

- [x] **A letter box that has focus cannot be retyped.** The boxes are
      `maxlength="1"` and relied on `onfocus` selecting the box's content, so
      clicking a box that already had focus fired no focus event, nothing was
      selected, and `maxlength` swallowed the keystroke without firing `input`
      at all: the last box of a word, where typing leaves focus, was exactly the
      one that could not be overwritten. `LetterBoxes.svelte` now takes the
      insertion over in `onbeforeinput` for a plain typed character, before
      either rule can apply. Covered by two tests driven with real key events,
      which fail without the fix.
- [x] **The favicon was Svelte's logo.** It is the original app's own icon now
      (`src/lib/assets/favicon.png`, copied from
      `../vonj-app/App_Resources/Android/.../drawable-xxxhdpi/icon.png`), and
      with a `<title>` on every route a bookmarked tab says what it is.

## Open questions

Decisions to make before the tasks that depend on them.

- [ ] **Long press as the reset gesture.** Long press has no established meaning
      on the web and does not exist for mouse users. Options: keep long press for
      touch and add a right-click or a small overflow menu, or move resetting into
      an explicit control. Blocks the reset work.
- [ ] **Level unlocking.** The original ships with sequential unlocking written
      but disabled, so everything is always playable. Enable it or drop the code
      path. See [`docs/original-app/navigation.md`](docs/original-app/navigation.md).
- [ ] **A demo mode trigger.** Demo mode was entered by typing the name `demo`,
      and there is no name field any more. A query parameter, a build flag, or
      drop the feature.

### Settled

- **Reorder implementation.** Pointer-events dragging on the handle **plus** a
  visible up/down button per row, and no new dependency. The buttons are not a
  hidden fallback: they are an equal way to play, and they are what makes the
  ordering games keyboard-operable.
- **Audio autoplay.** Attempt it and treat a refusal as a normal outcome, landing
  in a prominent ready-to-play state. In practice the tap that opened the level
  counts as the gesture, so it works from the second screen onwards.
- **The volume warning.** Dropped. The web cannot read device volume, and warning
  someone whose volume is already up is worse than not warning at all.
- **Alert dialogs.** The original's wrong-answer dialogs became inline messages,
  with the Dutch copy kept verbatim. A blocking `window.alert` cannot be styled
  or tested and interrupts the page.
- **Animated illustrations.** Animated WebP, not video: it stays an `<img>`, so
  there is no autoplay policy to work around, and it still cuts 28 MB to 6.2 MB.
- **Multiple pupils per browser.** Accepted as a limitation, as in the original.
  A shared classroom device shares one set of progress, and there are no
  name-scoped keys.
- **Identity.** There is none. No name screen, no greeting by name.
