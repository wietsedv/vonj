# Onboarding

## The authenticate screen

Shown on first launch, and whenever no identity is stored. The screen header
reads:

> Vul een naam in om te beginnen!

Below it sits a white rounded card with the form:

| Field  | Label                     | Behaviour                                                                                                    |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| School | "Op welke school zit je?" | Read-only text field. Tapping it opens the school picker. Hidden entirely when only one school is available. |
| Name   | "Wat is je naam?"         | Free text field. No validation beyond "not empty".                                                           |
| Submit | "Begin nu!"               | Only visible once both a school and a name are set.                                                          |

While the list of schools is being fetched, a spinner is shown instead of the
submit button.

If the fetched configuration contains exactly one school, that school is
selected automatically and the school field is not rendered at all. With the
bundled Gronings dataset this is the normal case: the only school is
"Demo School".

Submitting with a missing school or an empty name shows the alert:

> Selecteer eerst je school en vul je naam in

On success the identity (school id, name, and whether the data came from the
offline dataset) is stored on the device and the pupil is taken to the global
overview.

## The school picker

A modal list. Every row shows a school-building icon, the school name, and the
language of that school underneath in smaller grey text. Schools from all
configured languages appear in one flat list. Tapping a row closes the modal and
fills in the school field.

## Identity and sessions

There is no password and no account. The identity is just a school plus a first
name, stored locally. It is used for two things:

- greeting the pupil by name on the global overview;
- tagging answers that are submitted to the server, so a teacher can look at the
  results of a class.

There is no explicit log out. The way to switch identity is to long press the
global overview header and confirm "Alles resetten?", which clears the stored
identity together with all progress and returns to the authenticate screen.

## Demo mode

The name `demo` (case insensitive) puts the app in demo mode. Demo mode is meant
for showing the app on a shared device without accumulating progress.

In demo mode:

- The greeting drops the name: the title is "Moi! Hoe goed is jouw Grunnegs?"
  instead of "Moi Anne! Hoe goed is jouw Grunnegs?".
- Level progress and scores are **not** written to device storage.
- Answers are **not** submitted to the server.
- Opening a category resets that entire category, so every level starts fresh
  and the level content (which words, which distractors) is regenerated.

Everything else behaves identically, including in-level progress, feedback and
stars, for as long as the app stays open.
