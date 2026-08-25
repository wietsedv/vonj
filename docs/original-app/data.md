# Data and persistence

## Where content comes from

The original app talks to a small JSON API and ships a full copy of the same data
as a bundled fallback.

| Endpoint                           | Purpose                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /`                            | Presets: the list of languages, each with its schools. Feeds the school picker on the onboarding screen. |
| `GET /categories/<schoolId>`       | The category, section and level structure for that school, plus the list of stories used.                |
| `GET /target/<languageId>/<story>` | Everything about one story: recording, illustrations, fragments, sentences, words, sounds.               |
| `POST /submit`                     | One answered item, for teacher-facing reporting.                                                         |

The base URL in the shipped build is `http://app-api.devries.cloud`.

Requests fall back to the bundled dataset. If a request fails, the app switches
that session to offline mode and retries against the bundled data; if it still
finds nothing it reports which path failed and retries. In the shipped build the
offline path is in fact **forced on for every request**, so the app runs entirely
from bundled data and the network is never actually used. That makes the whole
app usable without connectivity, which matters in classrooms.

Any error returned by the API is surfaced to the pupil as an alert titled
"Er is iets mis gegaan".

## What gets submitted

Every time an item is answered, one record is posted:

- school id and pupil name;
- level id, in the form `<category>.<section>.<story>`, for example
  `listen.words.bragel`;
- the index of the item inside the level;
- the target answer, the item's difficulty, all responses the pupil gave in
  order, and the distractors that were on screen.

Because responses are sent as a list, the record shows not only whether the pupil
got it right but how many attempts and which wrong answers they picked, which is
the interesting part for a teacher.

Nothing is submitted in demo mode.

## What is stored on the device

Two kinds of local state:

| Key                            | Contents                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `auth`                         | School id, pupil name, and whether the session is running offline                     |
| `<category>.<section>.<story>` | One level: its generated items with all responses so far, and its score once finished |
| `dataVersion`                  | The content version the stored levels were generated against                          |

Storing the generated items, not just the score, is what makes a level stable:
the same words, the same distractors and the same order come back when the level
is reopened. It is also what makes resuming exact, since each item carries its
own response history.

Progress is written after every answered item, so closing the app mid-level
loses nothing.

Nothing is stored in demo mode.

## Content versioning

The bundled dataset carries a version number. When the app starts and finds that
the stored `dataVersion` does not match the current one, it discards all stored
levels and regenerates them. Without this, a content update could leave a pupil
with stored items referring to sentences, words or images that no longer exist.

## How this maps onto the web rewrite

The web app has no backend at all, and stores its state in `localStorage` rather
than in `ApplicationSettings`. The persistence design above carries over almost
unchanged; the API and answer submission do not. See
[../rewrite.md](../rewrite.md).
