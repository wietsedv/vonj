# Scoring

## What is counted

The only thing that counts is how many extra attempts a level needed. For each
item, the number of mistakes is the number of responses minus one, so an item
answered right first time costs nothing and an item that took four attempts costs
three.

Hints handed out by a timer count as responses in **Luisteren > Woorden met
tijdslimiet** only, which is the one timed section where running the clock down
lowers the score. In Lezen > Zinnen and Schrijven > Woorden an expiry records
nothing, so the clock hands over part of the answer for free and only the
"Jammer!" on the feedback card marks it. See
[Games](games.md#the-three-timed-sections-do-not-agree-on-what-an-expiry-costs).

One quirk of Schrijven > Woorden goes the other way: when a wrong answer's hint
happens to complete the word, the untimed game records that completing answer as
a response of its own, so the item costs one mistake for the wrong attempt and a
second for having been finished by the hint.

## From mistakes to a score out of six

A level score is a whole number from 0 to 6:

```
score = round( 6 - (mistakes / (items * tolerance)) * 6 )   , clamped to >= 0
```

`tolerance` is how many mistakes per item are tolerated before the score reaches
zero:

| Game                                | Tolerance |
| ----------------------------------- | --------- |
| Luisteren > Verhaaltjes             | 2         |
| Lezen > Verhaaltjes                 | 2         |
| Luisteren > Woorden (both variants) | 3         |
| Lezen > Zinnen (both variants)      | 3         |
| Schrijven > Woorden (both variants) | 3         |
| Spreken (all three sections)        | 3         |

So a ten-item writing level allows thirty mistakes before the score bottoms out,
while a nine-item listening story level allows eighteen. A flawless level always
scores 6.

The score is computed once, when the pupil taps through the feedback of the last
item, and stored with the level.

## From a score to stars

Scores are shown as three stars, which can be empty, half or full. The
0-6 score maps to half-star steps:

| Score | Stars             |
| ----- | ----------------- |
| 0     | empty empty empty |
| 1     | half empty empty  |
| 2     | full empty empty  |
| 3     | full half empty   |
| 4     | full full empty   |
| 5     | full full half    |
| 6     | full full full    |

The same three-star display is used in three places:

- on a level card in the category overview, for that level's score;
- on the level result card, for the level just finished;
- on a category card in the global overview, for the average of that category's
  level scores.

A category only shows stars once **all** of its levels have been played;
until then it shows a play icon and the "x van de y levels gespeeld" line. The
category average is a plain mean of the level scores, so it is not rounded to a
whole number before being turned into stars.

The global overview promises a final verdict once everything is done ("Speel alle
levels uit voor een eindoordeel!"), but the original app does not render an
overall score beyond the four per-category star ratings.
