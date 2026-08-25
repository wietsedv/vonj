# Navigation and progress

The app has no tab bar and no side menu. It is a straight stack: global overview
-> category overview -> level. Every screen below the global overview has a
round back button in the top left corner. The system action bar is hidden; the
coloured header of each screen doubles as the title bar and extends under the
status bar.

## Global overview

The landing screen after onboarding.

**Header**

- Title: "Moi <name>! Hoe goed is jouw Grunnegs?" (in demo mode: "Moi! Hoe goed
  is jouw Grunnegs?")
- Subtitle: "Speel alle levels om erachter te komen!"

**Body**

One card per category, in fixed order: Luisteren, Lezen, Schrijven, Spreken.
Each card shows:

- the category icon on the left;
- the category name;
- a progress line: "3 van de 12 levels gespeeld";
- on the right either a play icon (category not finished) or three stars showing
  the average score of that category (all levels finished).

While the category list is still loading, a spinner is shown in place of the
cards.

**Footer**

- Footnote above the cards' end: "Speel alle levels uit voor een eindoordeel!"
- App version, right aligned and semi-transparent, for example "v0.1.0".

**Animation**

Cards translate in from the left and fade in with a 100 ms stagger when the
screen loads, and slide out to the left in reverse order when navigating away.

**Gestures**

| Gesture               | Effect                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tap a category        | Open the category overview with a 300 ms slide transition                                                          |
| Long press the title  | Confirm "Alles resetten?" then wipe identity and all progress and return to onboarding                             |
| Long press a category | Confirm "Onderdeel '<name>' resetten?" then clear that category's levels and alert "Onderdeel '<name>' is gereset" |

## Category overview

**Header**

- Category icon and name as the title, with a back button.
- The category description underneath, for example "Speel deze levels om
  erachter te komen hoe goed jij Gronings verstaat!".

**Body**

One block per section, in the order defined by the content:

- Section name in large white text.
- The first line of the section description in smaller white text. (Section
  descriptions can be two lines; the second line is instruction detail and is
  shown inside the level itself, not here.)
- A wrapping row of level cards labelled "Level 1" to "Level 4". Each card shows
  either a play icon (not yet finished) or three stars (finished, showing the
  score of that level).

When every level of the category is finished, two extra elements appear at the
bottom:

- "Je hebt hier alle onderdelen gespeeld!"
- A button "Terug naar het overzicht".

**Animation**

Level cards slide and fade in one by one on load, and out on navigation, exactly
like the category cards.

**Gestures**

| Gesture                   | Effect                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Tap a level               | Open the matching game for that section and story                                 |
| Long press a section name | Confirm "Onderdeel '<name>' resetten?" then reset all four levels of that section |
| Long press a level card   | Confirm "Onderdeel <section> level <n> resetten?" then reset that single level    |

Tapping a level of a section that has no game implementation shows
"Onderdeel '<name>' is nog niet geïmplementeerd". With the shipped content set
every section is implemented.

## Level unlocking

The original app contains a complete sequential unlocking mechanism that is
**disabled in the original**: every category and every level is always playable.

The mechanism, should the rewrite want it:

- A category is unlocked when every level of every earlier category is finished.
- A level is unlocked when the previous level in the same section is finished.
- A locked card shows a padlock icon instead of the play icon, does not respond
  to taps or long presses, and a locked category card shows the description
  "Speel eerst de bovenstaande onderdelen".

## Resetting

Resetting is always available through a long press plus a confirmation dialog,
at four scopes:

| Scope      | Where                                                | What is cleared                                             |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Everything | Global overview title                                | Identity, all levels, all cached content                    |
| Category   | Category card                                        | Score and generated items of all levels in the category     |
| Section    | Section name on the category overview                | Score and generated items of the four levels in the section |
| Level      | Level card, or the result screen of a finished level | Score and generated items of that level                     |

Clearing a level discards both its score and its generated items, so replaying
it draws a fresh selection of words, sentence order and distractors.

Separately, the app force-resets all level progress when the bundled content
version changes, so a content update never leaves a pupil with items that point
at material that no longer exists.

## Resuming

Progress is stored per item, not per level. On opening a level the app scans its
items from the start and jumps to the first one that has not been answered
correctly yet. A level that was fully finished opens directly on its result
screen.
