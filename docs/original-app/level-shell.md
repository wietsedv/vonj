# Level shell

Every game shares the same frame. Only the middle of the screen differs per game
type.

```
+--------------------------------------------------+
| <-   [icon] Section name                         |  header
|      Section description (both lines)            |
+--------------------------------------------------+
|            optional top area                     |  audio player, timer,
|                                                  |  story text or Dutch prompt
+--------------------------------------------------+
|                                                  |
|                  game body                       |  picture grid, sound
|                                                  |  columns, letter boxes,
|                                                  |  drag list, feedback card
|                                                  |
+--------------------------------------------------+
|            (1) (2) (3) (4) (5) ...               |  progress dots
+--------------------------------------------------+
```

## Header

The section name with the section icon as the title, the full section
description underneath (including the second instruction line that the category
overview truncates), and a round back button in the top left. Leaving a level
mid-way keeps everything that was answered.

## Top area

Reserved for whatever the game needs above the interaction, and hidden once the
level is finished:

- **Audio player** for the listening games.
- **Timer card** for the timed games. In "Woorden met tijdslimiet" the timer
  sits next to the play button; in "Zinnen met tijdslimiet" it sits alone.
- **Story text card** for Lezen > Verhaaltjes.
- **Dutch prompt card** for Spreken.

## Progress dots

A centred row of small numbered dots at the bottom of the screen, one per item
in the level, numbered from 1. They fade in 300 ms after the level opens and
fade out when leaving.

| State   | Meaning                                                 |
| ------- | ------------------------------------------------------- |
| Current | The item being played right now                         |
| Correct | An earlier item answered correctly on the first attempt |
| Wrong   | An earlier item that needed more than one attempt       |
| Neutral | An item not reached yet                                 |

The dot count reveals the length of the level up front, which is between 8 and
10 items for the word games and depends on the story for the story games.

## Per-item feedback card

Answering an item correctly replaces the game body with a white feedback card
before continuing. The card is also what the timed games show when the clock has
run out, with different wording and colouring.

| Element     | Correct                                                                                                           | Out of time                |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Title       | "Dat klopt!" with a green check mark                                                                              | "Jammer!" with a red cross |
| Description | Varies per game, for example "Het juiste antwoord was:"                                                           | Same                       |
| Content     | The correct answer: an animated illustration, the sounds of the word, the written word, or the sentences in order | Same                       |
| Button      | "Doorgaan"                                                                                                        | "Doorgaan"                 |

In the sound-based games the sounds shown on the feedback card are tappable and
play that sound, and the app automatically plays back the pupil's own answer
sound by sound (animating each one as it plays) followed by the real recording of
the word.

Tapping "Doorgaan" on the last item of a level computes and stores the score and
switches the screen to the level result.

## Level result

Shown when a level has a score, that is: directly after finishing it, and again
whenever a finished level is reopened.

- Title "Goed gedaan!"
- Three stars representing the score (see [Scoring](scoring.md))
- The animated illustration of the story
- Button "Terug naar het overzicht"
- Button "Dit level nog een keer spelen", which resets the level and immediately
  restarts it with freshly generated items

The replay button is only offered for a level that was already finished when the
screen was opened, so it does not appear on the result screen you have just
played into.
