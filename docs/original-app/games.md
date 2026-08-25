# Games

There are six distinct game types, one per level screen in the original. Three of
them appear twice, once relaxed and once against the clock, and one appears three
times at three word lengths, which gives the eleven sections of the app.

| Category  | Section                 | Game                                                                | Timed |
| --------- | ----------------------- | ------------------------------------------------------------------- | ----- |
| Luisteren | Verhaaltjes             | [Listen and match a picture](#luisteren--verhaaltjes)               | no    |
| Luisteren | Woorden                 | [Hear the sounds of a word](#luisteren--woorden)                    | no    |
| Luisteren | Woorden met tijdslimiet | Hear the sounds of a word                                           | yes   |
| Lezen     | Verhaaltjes             | [Read and match a picture](#lezen--verhaaltjes)                     | no    |
| Lezen     | Zinnen                  | [Put the sentences in order](#lezen--zinnen)                        | no    |
| Lezen     | Zinnen met tijdslimiet  | Put the sentences in order                                          | yes   |
| Schrijven | Woorden                 | [Spell the missing word](#schrijven--woorden)                       | no    |
| Schrijven | Woorden met tijdslimiet | Spell the missing word                                              | yes   |
| Spreken   | Korte woorden           | [Build the pronunciation](#spreken--korte-normale-en-lange-woorden) | no    |
| Spreken   | Normale woorden         | Build the pronunciation                                             | no    |
| Spreken   | Lange woorden           | Build the pronunciation                                             | no    |

Shared mechanics that apply to all of them are described first.

## Shared mechanics

### Items

A level is a fixed list of items, generated once when the level is first opened
and then stored, so reopening a level shows the same items in the same order
with the same distractors. Resetting a level throws the list away and a new one
is generated on the next visit.

Every item records:

- the target answer;
- its distractors;
- the list of responses the pupil gave, in order;
- a difficulty number.

An item counts as complete when the pupil's most recent response equals the
target. There is no maximum number of attempts: the pupil keeps working on the
same item until it is right. Every extra attempt costs score.

### Adaptive difficulty

Difficulty is carried forward from item to item inside a level:

- answered correctly on the first attempt: the **next** item's difficulty goes up
  by one;
- needed more than one attempt: the next item's difficulty goes down by one.

The range is 0 to 2 for most games, and -1 to 1 for Lezen > Zinnen. What
difficulty controls differs per game and is listed below. It never changes the
current item, only the following one, so difficulty cannot shift under the
pupil's feet.

### Audio player

The listening games use one shared player control: a circular button with a
progress bar above it. Its icon reflects the state:

| State    | Icon     |
| -------- | -------- |
| Loading  | ellipsis |
| Ready    | play     |
| Playing  | pause    |
| Finished | replay   |

The audio starts playing by itself as soon as the level is ready, and can be
replayed as often as the pupil wants. For story fragments the player is
restricted to a time range inside the full story recording, and the progress bar
shows progress within that range only. If the device volume is at zero the app
warns:

> Zet je geluid eerst wat luider

### Drag-and-drop list

The two ordering games use one shared list control. Items are dragged by their
handle into the intended order, and a "Versturen" button below the list submits
the whole order at once. Above the list:

> Gebruik de streepjes om de items naar de juiste volgorde te verslepen.

After submitting, each row gets a marker: a check mark if it is in the right
place, or an arrow showing which way it has to move. Rows that were given as a
hint are locked in place and pre-marked correct. The items start shuffled, with
any given rows fixed at the top.

### Timers

A countdown runs for the current step, and expiring never ends the level, it
gives away part of the answer:

- the next letter, sound or row is filled in, marked as correct and locked;
- in the listening game that sound is also played out loud;
- the countdown restarts for the next step.

The timer card shows the total time left for the whole item plus a line
"mm:ss tot volgende hint", which becomes "Tijd is om!" once every step has been
given away. A correct answer stops the clock immediately, and so does the last
step being given away.

| Section                             | Seconds per step | Step               |
| ----------------------------------- | ---------------- | ------------------ |
| Luisteren > Woorden met tijdslimiet | 15               | one sound          |
| Lezen > Zinnen met tijdslimiet      | 20               | one sentence chunk |
| Schrijven > Woorden met tijdslimiet | 20               | one letter         |

### The three timed sections do not agree on what an expiry costs

They look alike on screen but differ in the code, and the difference is worth
knowing because it decides whether running the clock down lowers the score:

| Section                             | Does an expiry record a response? | What submits the item                                           |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| Luisteren > Woorden met tijdslimiet | **Yes**, so it costs score        | The item submits itself once the last sound has been given away |
| Lezen > Zinnen met tijdslimiet      | No                                | The pupil still presses "Versturen"                             |
| Schrijven > Woorden met tijdslimiet | No                                | The pupil presses the button, which now reads "Volgende"        |

Only in Luisteren > Woorden does the clock cost score directly. In the other two
an expiry hands over part of the answer for free: a pupil who lets the clock run
out completely then submits an answer that is already correct, and the item
costs a single response, that is, no mistakes. The feedback card still says
"Jammer!" rather than "Dat klopt!", which is the only thing that marks the
difference to the pupil.

---

## Luisteren > Verhaaltjes

> Welk plaatje hoort bij het voorgelezen verhaal?

The pupil hears Gronings and picks the illustration that matches. Audio only, no
text anywhere on the screen.

**Items, in order**

1. **The whole story.** The complete recording plays. The options are the four
   story overview illustrations, one per story in the content set.
2. **One item per story fragment** that is at least two seconds long. Only that
   fragment of the recording plays. The options are fragment illustrations,
   the correct one plus distractors drawn from the fragments of all stories.
3. **The recap.** The fragment illustrations of this story, shuffled, to be
   dragged into the order in which they happen in the story. Two details differ
   from the fragment items above: the recap uses **every** fragment, including
   the ones under two seconds that never became items of their own, and its
   **first tile is given and locked**. The app initialises the given count to 1
   and never changes it; the method that would raise it exists but every call to
   it is commented out, so the head start is one tile at every difficulty.

**Interaction**

Options are shown as a grid of illustrated cards, two columns wide. Tapping a
wrong card lays a translucent red "Helaas!" banner over it, and that card cannot
be tapped again. Tapping the right card shows the feedback card: "Dat klopt!",
"Het juiste antwoord was:", and the animated version of the illustration.

For the recap item, submitting a wrong order alerts:

> Nog niet alle plaatjes staan op de juiste plaats

and marks each tile with a check mark or a direction arrow. The pupil rearranges
and submits again. The recap item has no "Het juiste antwoord was:" line in its
feedback, but it does still show the **story's** animated illustration there: the
player and the feedback card are bound the same way for all three item kinds, and
the recap's target carries the story's own animation.

The recap plays **the whole story recording, unranged**, as the first item does.
The player is always given the story's recording and the current item's time
range, and the recap's target has no time range, which the player reads as "play
the whole file".

**Difficulty** controls the number of options: 4 at difficulty 0, 5 at 1, 6 at 2.

## Luisteren > Woorden

> Hoe klinken deze woorden?
> Kies de juiste klanken uit iedere kolom.

Ten single words from the story, one per item, in random order. The pupil hears
the word and reconstructs which Gronings sounds it is made of.

**Interaction**

The word's recording plays through the audio player at the top. Below it, one
column per sound in the word. Each column has:

- a display field at the top showing the sound chosen for that position, which
  replays that sound when tapped;
- a stack of candidate sounds below it. The correct sound is always among them,
  the rest are random sounds from the Gronings sound inventory. Tapping a
  candidate selects it **and** plays it, so the pupil can compare sounds by ear.

A "Versturen" button appears once every column has a choice and something has
changed since the last submit. Submitting an incomplete answer alerts:

> Selecteer eerst alle klanken

On submit, each column turns green or red. On a correct answer the feedback card
shows "Dat klopt!", "De juiste uitspraak is:", the sounds of the word as
tappable fields, and the Dutch translation as "Nederlands: <translation>".

After every submit, correct or not, the app plays back the pupil's own answer:
each chosen sound in turn, scaling up as it sounds, and then the real recording
of the word. Selecting a different sound interrupts that playback.

**Difficulty** controls the number of candidates per column: 2 at difficulty 0,
3 at 1, 4 at 2.

**Timed variant.** 15 seconds per remaining sound. Each expiry reveals and plays
the next sound and locks it in as correct. When the last sound has been given
away the item submits itself and the feedback card says "Jammer!". In the timed
variant the answer playback after a wrong submit is skipped, only the word
recording plays.

## Lezen > Verhaaltjes

> Welk plaatje hoort bij het verhaaltje?

The reading counterpart of Luisteren > Verhaaltjes. No audio at all.

The **first sentence** of a story fragment is shown in a white card at the top,
and the pupil picks the matching illustration from the same kind of two-column
grid, with the same red "Helaas!" overlay on wrong cards and the same animated
illustration in the feedback ("Het juiste antwoord was:"). A fragment usually has
two or three sentences; the rest are never shown, so the card is one line of
Gronings rather than the whole scene.

One item per story fragment of at least two seconds. There is no whole-story
item and no recap item.

**Difficulty** controls the number of options: 4, 5 or 6.

## Lezen > Zinnen

> Sleep te zinnen in de juiste volgorde om het verhaaltje leesbaar te maken.

The pupil reassembles the story from scrambled pieces of text.

**Items**

- Sentences of a fragment are cut into chunks of three words, the last chunk of a
  sentence taking whatever is left. Chunks accumulate until there are more than
  three, which then form one item. So one item is roughly one to two sentences
  cut into four or more pieces.
- The "more than three" check happens after a **whole sentence** has been cut up,
  not after each chunk, which is why an item can hold more than four chunks: a
  sentence that pushes the count from three to seven yields one seven-row item.
- At the end of a fragment the leftover chunks become one more item if there are
  **at least three** of them, and are **dropped entirely** if there are fewer. So
  a level can hold a three-row item, and a fragment's last one or two chunks may
  never be played.
- The final item of the level is the whole story: each fragment's full text as
  one row, to be put in story order.

**Interaction**

A "Resultaat" card above the list shows the current order as one line, with the
chunks joined by bullet separators, so the pupil can read back the sentence they
are building. Below it the drag-and-drop list, and a "Versturen" button.

A wrong order alerts:

> Nog niet alle onderdelen staan op de juiste plaats

and marks every row with a check mark or an up or down arrow. The correct
feedback card shows "Dat klopt!", "Het juiste verhaaltje was:", and the sentences
in the right order.

**Difficulty** ranges from -1 to 1 and controls the free head start, which is
`max(0, 1 - difficulty)` rows given and locked: **two** chunks at difficulty -1,
one at 0, and nothing at 1.

**Timed variant.** 20 seconds per remaining row. Each expiry locks the next row
of the correct order in place as a hint. There is no free head start in the
timed variant, and the clock stops once every row has been given away.

## Schrijven > Woorden

> Hoe schrijf je het missende woord in het Gronings?

Up to ten words from the story, one per item, to be typed letter by letter in
Gronings spelling.

**Interaction**

A white card shows two prompts:

- **Grunnegs**: the Gronings sentence the word comes from, with the word itself
  replaced by a bracketed run of dots, one dot per letter, so the pupil sees both
  the context and the length: `Over en deur [......] lopen.` Two dozen words in
  the content set are listed under a sentence whose text does not contain them;
  for those the app shows the dots on their own, with no sentence around them.
- **Nederlands**: the Dutch translation of the missing word.

Below that, one single-character input box per letter. Typing a letter advances
the focus to the next box automatically; backspace on an empty box moves focus
back. Autocorrect and autocapitalisation are off. The first letter is filled in
for free and its box is locked.

"Versturen" appears once every box has a letter. On submit, each box turns green
or red per letter. If the answer is wrong, one more letter is revealed as a hint
and locked, and the pupil tries again. If revealing that letter happens to
complete the word, the item counts as complete but the feedback card says
"Jammer!" instead of "Dat klopt!".

The feedback card shows "Het juist geschreven woord is:" with the word spelled
out in the same letter boxes.

**Timed variant.** 20 seconds per remaining letter, with each expiry revealing
and locking the next letter. No letter is given for free at the start, and wrong
answers do not trigger a hint, only the clock does. Once the clock has run out
the submit button reads "Volgende" instead of "Versturen".

## Spreken > Korte, Normale en Lange woorden

> Hoe spreek je deze woorden uit in het Gronings?
> Tik op de klanken van links naar rechts hoe de woorden in het Gronings klinken.

The speaking games use the same sound-column interface as Luisteren > Woorden,
but the other way round: there is no audio prompt. The pupil is given the Dutch
word and has to build the Gronings pronunciation from sounds.

**Interaction**

A card at the top shows "Nederlands" and the Dutch word. Below it the sound
columns, one per sound of the Gronings word, each with a display field and a
stack of candidate sounds. Tapping a candidate selects and plays it. "Versturen"
submits; an incomplete answer alerts "Selecteer eerst alle klanken".

After every submit the app plays back the answer the pupil built, sound by
sound, and then the real recording of the word, so they can hear how close they
were. The feedback card shows "Dat klopt!" and "De juiste uitspraak is:" with the
sounds as tappable fields.

**The three sections differ in word length and in candidate count**, because the
section sets the starting difficulty:

| Section         | Sounds per word | Candidates per column |
| --------------- | --------------- | --------------------- |
| Korte woorden   | 2 to 3          | 2                     |
| Normale woorden | 4 to 6          | 3                     |
| Lange woorden   | 7 to 10         | 4                     |

Within a level, difficulty still adapts up and down from the section's starting
point, within the same overall range of 2 to 4 candidates, so a run of correct
answers in "Korte woorden" adds candidates as the level goes on and a run of
mistakes in "Lange woorden" takes them away.

Up to ten words per level, chosen at random from the words of the story that fit
the length range and have a Dutch translation.
