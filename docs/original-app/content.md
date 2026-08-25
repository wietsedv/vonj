# Content

The app is content-driven: the categories, sections and levels come from data,
not from code. One dataset ships with the app and covers a single language,
Gronings, and a single school, "Demo School".

## Structure

```
Language (gronings)
└── School (demo)
    └── Categories: Luisteren, Lezen, Schrijven, Spreken
        └── Sections: Verhaaltjes, Woorden, Zinnen, ...
            └── Levels: one per story
Stories (4): bragel, kopstubber, scheuvels, zoepenbrij
└── Fragment (8 per story): illustration + time range in the recording
    └── Sentence: Gronings text + time range
        └── Word: Gronings spelling, Dutch translation, sounds, recording
```

A level is the intersection of a section and a story: "Luisteren > Woorden,
level 2" means "the word game played on the _kopstubber_ story". The level cards
are labelled "Level 1" to "Level 4" and do not name the story, so the story is a
surprise until it is played.

## The four stories

Each story is a short everyday scene, named after a Gronings word that features
in it:

| Story        | Key word means      | Content                                                                                      |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| `bragel`     | mud                 | A school trip over the Waddendiek, walking through the mud in short trousers and bare feet   |
| `kopstubber` | ceiling brush       | Cleaning the house, with two stone dogs on the mantelpiece that were a keepsake from grandpa |
| `scheuvels`  | ice skates          | Ice skating races on the Botterdaip, with a stall selling pea soup and hot sausage           |
| `zoepenbrij` | buttermilk porridge | Mum goes to the shop and brings home a surprise for Koos, who had to stay behind             |

Per story the content set holds:

- one recording of the whole story, read aloud by a native speaker;
- an overview illustration, as a still image and as an animated version;
- eight fragments, each with its own still and animated illustration and its own
  time range inside the recording;
- the sentences of each fragment as Gronings text with word-level detail.

Fragments shorter than two seconds are skipped by the games that play a fragment
on its own, so a level has at most eight fragment items and usually fewer.

## Words

Every word inside a sentence carries:

- its Gronings spelling, for example `noar`;
- its Dutch translation, for example `naar`;
- its sequence of sounds, for example `n`, `o`, `r`;
- a recording of the word spoken on its own.

The word games only use words longer than one character, and never use the same
spelling twice within a level. The speaking sections additionally filter by
number of sounds. There are around 345 single-word recordings in the shipped
set.

## Sounds

Gronings is written with a set of about 43 sound units, each with its own
recording. These are the building blocks the pupil taps in the listening and
speaking games:

- single consonants: `b d f g h j k l m n p r s t v w z`
- consonant clusters treated as one sound: `ng nj tj`
- short vowels: `a e i o u`
- long vowels and digraphs: `aa ee ie oe oo uu eu uh`
- diphthongs: `ai ei oi ui ou aai aau ooi`
- a glottal stop, written with a right single quotation mark
- `G!`, which is excluded from being offered as a distractor

Distractors in the sound games are drawn at random from this whole inventory, so
a column can offer a vowel where the answer is a consonant. Difficulty only
changes how many distractors are offered, not how confusable they are.

## Icons and copy

Sections and categories carry their own icon and their own description text in
the data, so a new language or school can ship different wording. The Gronings
set uses one icon per category, repeated on all of its sections: an ear for
Luisteren, a book for Lezen, a pencil for Schrijven, and a speaking head for
Spreken.

Section descriptions can hold two lines. The category overview shows only the
first line; the level itself shows both.

## Adding content

Because everything is data, a new story is a matter of supplying a recording, the
fragment illustrations with their time ranges, and the transcribed sentences with
word-level translations and sounds. The games then generate their own items from
that material. Adding a story to a section adds one level to it, which changes
the level count shown on the category cards.
