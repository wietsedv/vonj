# Rewrite decisions

Deliberate differences between this web app and the original native app. The
[`original-app/`](original-app/) documents describe the original; where this
document contradicts them, this document wins.

## No backend

The web app has no server-side component. There is no API, no database and no
account system. Everything the app needs ships with it, and everything the app
remembers stays on the pupil's device.

**What that removes, compared to the original:**

| Original                                       | Web                                                         |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `GET /` presets, listing languages and schools | Gone. One bundled language (Gronings), one implicit school. |
| `GET /categories/<schoolId>`                   | Gone. The category, section and level structure is bundled. |
| `GET /target/<lang>/<story>`                   | Gone. Story content is bundled.                             |
| `POST /submit` per answered item               | **Gone. There is no teacher-facing reporting.**             |

Losing `/submit` is the one real feature loss. In the original, every answer was
posted with the pupil's name, the level, all attempts and the distractors on
screen, which let a teacher see how a class was doing. Nothing in the web app
replaces that; results exist only on the device that produced them.

This is less of a change than it looks: the shipped native build forced every
request onto the bundled offline dataset anyway, so the app already ran entirely
from local content and the backend was effectively dead. See
[`original-app/data.md`](original-app/data.md).

**What it simplifies:**

- **There is no onboarding at all.** See below.
- **No loading or error states for content.** No "Er is iets mis gegaan", no
  "Geen verbinding", no spinner while categories load.
- **Offline is not a feature any more, it is the only mode.**

## No identity

The web app never asks who is playing. The original's authenticate screen exists
to pick a school and to tag submitted answers with a pupil's name; with the
backend gone, neither has anything left to do, and a name screen standing between
a child and the first level buys nothing.

**What that removes, compared to
[`original-app/onboarding.md`](original-app/onboarding.md):**

- the school picker and the "Vul een naam in om te beginnen!" screen;
- the stored `auth` value, and with it the `name` key;
- the greeting by name. The global overview keeps the header it already has,
  "Hoe goed is jouw Gronings?", instead of "Moi Anne! Hoe goed is jouw
  Grunnegs?";
- "Alles resetten?" no longer returns to a name screen, it simply clears
  progress.

Demo mode was triggered by typing the name `demo`, so it loses its trigger along
with the name field. It needs a new one, or it goes; nothing is implemented for
it yet.

## Routes

The original app had no URLs: it was a navigation stack of screens. The web app
needs addresses, and they are the ids the app already uses everywhere else.

| URL                    | Screen                                   |
| ---------------------- | ---------------------------------------- |
| `/`                    | The global overview                      |
| `/luisteren`           | A category overview                      |
| `/luisteren/woorden/1` | A level: category, section, level number |

The last segment is the **level number**, not the story, for the same reason the
level card says "Level 1": a level never names the story it is played on. The
number is the position in the section, so `/luisteren/woorden/1` is the level
stored under `luisteren.woorden.bragel`.

Anything that is not a real category, a section of that category, or a level
number the section has, is a 404. The category segment is checked by a route
matcher, so an unknown top-level path can never be mistaken for a level.

## The level shell

Two deliberate differences from
[`original-app/level-shell.md`](original-app/level-shell.md), both about a native
detail that does not survive the move to the web:

- **The current progress dot has a white ring.** In the original the dots sat in
  a coloured footer bar and the current dot was filled with that same colour, so
  what marked it was its white number rather than a circle. There is no footer
  bar here, so the ring stands in for it and the four states stay tellable
  apart.
- **Reopening a level whose last item was answered lands on that item**, not on
  the first one. The original scanned for the first item not yet answered
  correctly and fell back to item 1 when there was none, which put someone who
  answered the last item and left before "Doorgaan" back at the beginning of the
  level. Resuming on the last item means the next "Doorgaan" finishes the level,
  which is what they were about to do.

## The games

### The order of the options is fixed per item

The original shuffled the options of a picture item every time the item came up,
which is once per visit: leaving a level halfway and coming back moved the cards
around. Here the order is derived from the item instead of drawn, so an item
always shows its options in the same places, in the same spirit as the stored
distractors. What changes with difficulty is only how many of the stored
distractors are shown, which is what the original did too.

The pupil never sees the difference within one attempt either way, because
neither version reshuffles on a wrong answer.

### Reordering is dragged or buttoned, not dragged only

The original dragged rows by a handle and nothing else. Native HTML5 drag and
drop is poor on touch, which is the primary platform here, and dragging has no
keyboard equivalent at all.

`ReorderList.svelte` therefore does both: a pointer-events drag on the handle,
which works the same for touch and mouse, **plus a visible up and down button on
every movable row**. The buttons are not a hidden accessibility fallback, they
are an equal way to play the game, and they are what makes the ordering games
keyboard-operable. No drag-and-drop library was added.

The original's instruction line, "Gebruik de streepjes om de items naar de juiste
volgorde te verslepen.", only mentions dragging. It is kept verbatim, because it
is the original's copy and the handle it names is still there, and `ReorderList`
adds a second sentence after it for the half the original could not know about:
"Of gebruik de pijltjes om een item omhoog of omlaag te zetten." Leaving it out
left the only line above the list describing the one way of playing that a
keyboard cannot use.

### Audio autoplay is attempted, and degrades to a play button

The original starts a recording the moment a level is ready. Browsers refuse
audible playback without a prior user gesture, and on a fresh page load there
may not have been one.

`AudioPlayer.svelte` attempts autoplay and treats a refusal as a normal outcome
rather than an error: it lands in its ready state, showing the play icon, and the
pupil taps once. In practice the tap that opened the level usually counts as the
gesture, so autoplay works from the second screen onwards. Nothing about the game
depends on the recording having started by itself.

### The volume warning is gone

The original warned "Zet je geluid eerst wat luider" when the device volume was
at zero. The web cannot read device volume, and a warning shown to someone whose
volume is already up is worse than no warning, so it is dropped rather than
guessed at.

### Alerts are inline messages, not dialogs

The original reported a wrong submit through a native dialog: "Nog niet alle
plaatjes staan op de juiste plaats", "Nog niet alle onderdelen staan op de juiste
plaats", "Selecteer eerst alle klanken". A blocking `window.alert` is the wrong
web equivalent: it cannot be styled, it interrupts the page, and it cannot be
tested.

The copy is kept verbatim and shown inline, next to the thing it is about. The
row and column markings that accompanied it in the original are unchanged.

### The timed games do not remember their clock

A level stores its items and their responses, not the state of a countdown. For
**Luisteren > Woorden met tijdslimiet** that costs nothing, because an expiry
there records a response and so is stored like any other.

The other two timed sections hand rows and letters over without recording
anything, which is the original's behaviour (see
[`original-app/games.md`](original-app/games.md)). Their given-away count
therefore lives in component state only, and reopening a level part way through
an item restarts that item's clock and takes back what the clock had given. The
original persisted no timer state either, so this is a limitation carried over
rather than one introduced. It costs the pupil nothing: those hints were free.

## State lives in localStorage

All persistent state is stored in `localStorage`. No cookies, no server session,
no database.

This is a close match for what the original did. The native app used
`ApplicationSettings`, which is the same thing: a synchronous, string-keyed,
per-app key-value store. The persistence design in
[`original-app/data.md`](original-app/data.md) therefore carries over almost
unchanged.

### Keys

| Key                            | Contents                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `<category>.<section>.<story>` | One level as JSON: its generated items with every response so far, and its score once finished. For example `luisteren.woorden.bragel`. |
| `dataVersion`                  | The content version the stored levels were generated against                                                                            |

Nothing else is stored: the app is anonymous, so the original's `auth` key has no
successor.

The ids in a level key are the Dutch ones this app uses throughout, not the
English ids of the original data (`luisteren.woorden.bragel`, where the original
would have written `listen.words.bragel`). They are the same ids as the route
segments, so a level key can be read straight off the URL. The full set of 44
level keys is known from the content, which is how a reset or a version bump
finds them all without having to prefix or enumerate `localStorage`.

### Why the items themselves are stored

Storing the generated item list, not just the score, is what makes a level
stable and resumable:

- **Stable.** The same words, the same distractors and the same order come back
  every time the level is reopened, because they were generated once and saved.
- **Resumable.** Each item carries its own response history, so reopening a level
  jumps to the first item not yet answered correctly, and the score reflects
  every attempt ever made.
- **Fresh on replay.** Resetting a level deletes its key, so replaying it
  generates a new item list with different words and distractors.

`localStorage` gives roughly 5 MB per origin, which is far more than 44 levels of
item lists need, so there is no reason to compress or to store a seed instead.

### Practical constraints

- **Not available during SSR or prerendering.** Anything that renders progress -
  the star ratings, the "x van de y levels gespeeld" lines - is client-only.
  Guard access with `browser` from `$app/environment` and read it after mount,
  and make sure the server-rendered markup is valid without it rather than
  something that flashes wrong values. In practice this means the progress line
  and the stars are simply absent until the store has been read, rather than
  claiming zero.
- **It can throw.** Private browsing modes and a full quota make reads and writes
  fail. Wrap access and treat failure as "no progress stored" rather than
  breaking the app.
- **Values are strings.** Level state is JSON-encoded. Malformed or outdated JSON
  should be discarded like a version mismatch, not crash a level.
- **It is per-origin and per-browser.** Progress does not follow a pupil to
  another device or another browser, and a shared classroom device shares one set
  of progress between everyone using that browser profile.

### Content versioning

Kept as-is from the original. The bundled content carries a version number; when
the stored `dataVersion` does not match it, all stored levels are discarded and
regenerated. Without it, a content update can leave a pupil with stored items
pointing at sentences, words or images that no longer exist.

The number is maintained by hand, in `src/lib/content/version.ts`. Regenerating
the content set does not bump it: whoever changes content decides whether the
change can invalidate stored items, and bumps it if so.

### Resetting

The reset scopes from [`original-app/navigation.md`](original-app/navigation.md)
map onto the keys directly: resetting a level removes its key, a section or
category removes the keys of its levels, and "Alles resetten?" removes all 44.

### Demo mode

Open question. The original triggered it by typing the name `demo`, and this app
has no name field, so the trigger is gone. If it comes back, the behaviour is the
same as before and simpler to implement: nothing is written to `localStorage` at
all, progress lives in memory for as long as the tab is open, and opening a
category resets it.

### It is not a security boundary

A pupil can edit their own scores with the devtools. That was equally true of the
original's device storage, and nothing here depends on the scores being
trustworthy.

## The content set is generated

The original app's dataset lives in one 5600-line TypeScript module,
`app/lib/offline.ts`, holding the payloads its API would have returned, and its
media sits in `app/assets/static/gronings/`. Neither is used directly.
`scripts/build-content.mjs` reads both out of `../vonj-app` and writes
`src/lib/content/`:

- `categories.json`, `sounds.json` and one file per story under `stories/`, with
  the English ids translated to the Dutch ones and the API envelope dropped;
- `assets/`, holding only what the app actually loads.

The script is the only thing that reads the original app, and it only reads. Run
it again after a content change; do not hand-edit the generated files.

### One correction to the Dutch copy

The original's copy is reused verbatim, with one exception: the Lezen > Zinnen
sections were described as "Sleep **te** zinnen in de juiste volgorde om het
verhaaltje leesbaar te maken." and read "Sleep **de** zinnen" here. The
`original-app/` documents still quote the typo, because they describe the
original.

The correction lives in `COPY_FIXES` in `scripts/build-content.mjs`, keyed by the
whole original line, and the script reports an entry that no longer matches
anything. That is the place for any further copy fix; do not edit the generated
JSON, and do not correct Gronings content this way.

### What happens to the media

The raw set is 66 MB and the original's runtime set is 42 MB. The web set is
12 MB.

| Media                  | Original           | Web                        |
| ---------------------- | ------------------ | -------------------------- |
| Animated illustrations | 36 GIF, 28 MB      | 36 animated WebP, 6.2 MB   |
| Still illustrations    | 36 PNG, 8.9 MB     | 36 WebP, 0.9 MB            |
| Recordings             | 392 MP3, 5.3 MB    | 360 MP3, 5.1 MB, unchanged |
| Uncompressed masters   | 4 WAV, 24 MB       | dropped                    |
| Praat annotations      | 4 TextGrid, 1.3 MB | dropped                    |

Both image formats are re-encoded to 512x512, which is larger than the biggest
card the app ever renders. The quality settings were chosen as the lowest that
stays visually indistinguishable from the source on this line art.

Animated WebP was picked over muted looping video because it stays an `<img>`:
no autoplay policy to work around, no poster image, and one file instead of two.

### How the content reaches the app

- The structure (`categories.json`, `sounds.json`) is small and always needed, so
  it is imported eagerly.
- A story is about 37 KB of JSON and only one is ever in play, so the stories are
  behind a dynamic `import()` and Vite gives each its own chunk.
- Media is imported through Vite rather than served from `static/`, so every file
  is fingerprinted and can be cached forever. The maps in
  `src/lib/content/assets.ts` hold URLs, not media, so nothing is fetched until
  something renders it.

The one wrinkle is that Vite inlines assets below a size threshold as base64,
which would have shipped the short sound recordings inside the module that holds
every URL. `vite.config.ts` turns inlining off for content assets.
