# Overview

## What the app is

**Van Old noar Jong: Grunnegs** ("From Old to Young: Gronings") is a language
game for children learning [Gronings](https://en.wikipedia.org/wiki/Gronings_dialect),
the regional language of the province of Groningen. It is used in primary
schools: a pupil enters their school and their first name, then plays a series
of short levels that test whether they can understand, read, write and speak
Gronings.

The app is built around four short illustrated stories that are read aloud by a
native speaker. Every game re-uses the same story material from a different
angle, so a pupil hears, reads, spells and pronounces the same vocabulary.

- Bundle id: `nl.cgtc.vonj`
- Store name: "Van Old noar Jong: Grunnegs"
- Language of the interface: Dutch
- Language being learned: Gronings
- Orientation: portrait only
- Fully playable offline

## The four categories

The home screen offers four categories. Each category contains sections, and
each section contains one level per story, so four levels per section.

| Category                  | Question it answers                                                      | Sections                                      | Levels |
| ------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- | ------ |
| **Luisteren** (Listening) | "Speel deze levels om erachter te komen hoe goed jij Gronings verstaat!" | Verhaaltjes, Woorden, Woorden met tijdslimiet | 12     |
| **Lezen** (Reading)       | "Speel deze levels om erachter te komen of jij Gronings kan lezen!"      | Verhaaltjes, Zinnen, Zinnen met tijdslimiet   | 12     |
| **Schrijven** (Writing)   | "Speel deze levels om erachter te komen of jij Gronings kan schrijven!"  | Woorden, Woorden met tijdslimiet              | 8      |
| **Spreken** (Speaking)    | "Speel deze levels om erachter te komen of jij Gronings kan spreken!"    | Korte woorden, Normale woorden, Lange woorden | 12     |

That is 44 levels in total. Each level is one story played through one game
type, and consists of a handful of consecutive items (typically 8 to 10).

## Flow at a glance

```
Authenticate  ->  Global overview  ->  Category overview  ->  Level  ->  Level result
(school+name)     (4 categories)       (sections x levels)    (items)    (stars)
```

1. **Authenticate.** First launch only. Pick a school if more than one is
   available, type a name, tap "Begin nu!".
2. **Global overview.** Greets the pupil by name, lists the four categories with
   their progress, and shows the app version at the bottom.
3. **Category overview.** Lists the sections of that category, each with a row
   of level cards showing either a play icon or the stars earned.
4. **Level.** Shows the section title and instruction, the game itself, and a
   row of numbered progress dots at the bottom. Every item gives immediate
   feedback before moving on.
5. **Level result.** After the last item, a result card shows the earned stars
   and an animated illustration of the story, with buttons to go back to the
   overview or to replay the level.

Progress is saved per level as soon as an item is answered, so a pupil can
close the app mid-level and resume at the first unfinished item.

## Design characteristics worth preserving

- **Immediate, forgiving feedback.** A wrong answer is never final. The pupil
  keeps trying the same item, and each extra attempt only costs score.
- **Adaptive difficulty.** Getting an item right first time makes the next item
  harder (more distractors); getting it wrong makes the next one easier. See
  [Games](games.md).
- **Hints instead of failure.** In the timed games the app gives away the next
  letter or sound when the clock runs out, so the pupil is always able to
  finish.
- **Audio everywhere.** Story recordings, single-word recordings and individual
  sound recordings can all be replayed on demand, including inside the feedback
  screens.
- **Staggered animations.** Cards on the overview screens slide and fade in one
  by one, and slide out when navigating away.
- **Long press is the reset gesture.** Long pressing a header, a category, a
  section or a level offers to reset that scope after a confirmation dialog.
