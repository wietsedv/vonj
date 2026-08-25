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

- **Onboarding is just a name.** With a single bundled school there is nothing to
  pick, and the original already hid the school field in that case. No school
  picker, no modal, no language list.
- **No loading or error states for content.** No "Er is iets mis gegaan", no
  "Geen verbinding", no spinner while categories load.
- **Offline is not a feature any more, it is the only mode.**

## State lives in localStorage

All persistent state is stored in `localStorage`. No cookies, no server session,
no database.

This is a close match for what the original did. The native app used
`ApplicationSettings`, which is the same thing: a synchronous, string-keyed,
per-app key-value store. The persistence design in
[`original-app/data.md`](original-app/data.md) therefore carries over almost
unchanged.

### Keys

| Key                            | Contents                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `name`                         | The pupil's first name                                                                                                             |
| `<category>.<section>.<story>` | One level as JSON: its generated items with every response so far, and its score once finished. For example `listen.words.bragel`. |
| `dataVersion`                  | The content version the stored levels were generated against                                                                       |

The original's `auth` key held a school id, a name and an offline flag. Only the
name survives, since there is one school and offline is unconditional.

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
  the star ratings, the "x van de y levels gespeeld" lines, the greeting by name
  - is client-only. Guard access with `browser` from `$app/environment` and read
    it after mount, and make sure the server-rendered markup is valid without it
    rather than something that flashes wrong values.
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

### Resetting

The reset scopes from [`original-app/navigation.md`](original-app/navigation.md)
map onto the keys directly: resetting a level removes its key, a section or
category removes the keys of its levels, and "Alles resetten?" clears everything
including the name and returns to the name screen.

### Demo mode

Kept, and simpler than before: the name `demo` means nothing is written to
`localStorage` at all. Progress lives in memory for as long as the tab is open
and disappears on reload. As in the original, opening a category in demo mode
resets it.

### It is not a security boundary

A pupil can edit their own scores with the devtools. That was equally true of the
original's device storage, and nothing here depends on the scores being
trustworthy.
