# Piano Tools

A browser dashboard for practising chords on the piano. Plug in a MIDI keyboard and play: the app recognises the chord, shows you what to play on an on-screen piano, and walks you through a chord progression like a score.

No piano at hand? Your computer keyboard works as a fallback keyboard.

> The app's interface is in French. Button and menu labels are quoted below as they appear on screen, with a translation.

## Quick start

```sh
npm install
npm run dev
```

Open the URL shown in **Chrome** or **Edge** (Firefox works too), plug in your MIDI keyboard and allow MIDI access when the browser asks. The device name appears at the top of the page once connected.

## The dashboard

The screen is a grid of modules you can arrange as you like:

- **Move** a module: grab it by its title bar.
- **Resize** it: drag its bottom-right corner.
- **Restore the default layout**: "Réinitialiser la disposition" (reset layout) button, top right.

The layout is saved in the browser between visits.

## Modules

### Accord joué (chord played)

Shows the last chord played in large type, with:

- its quality and inversion, e.g. "C majeur · 1er renversement · C E G" (C major · first inversion · C E G);
- the held notes with their octave, e.g. "E4 G4 C5";
- the chord to play, under "Cible" (target).

A green flash confirms when you play the target chord correctly. If the notes don't form any known chord, the module shows "?" and lists the notes.

### Historique (history)

The chords you played, newest first and in larger type. The same chord played several times in a row appears once. The list scrolls and keeps the last 200 chords.

### Accords (chords)

The chord library, in two tabs.

**Tous les accords (all chords)**: the 12 roots combined with 20 chord types.

- **Search** by name or type: "Am7", "sus4", "mineur" (minor)… Flats are understood: "Bbm7" finds A#m7.
- **Filter** by root with the C, C#, D… chips.
- **Click a chord** to show it on the piano as the target. Click it again to clear it.
- **"+"** adds the chord to the end of the score.
- **Drag a chord** onto the score to drop it where you want.

**ii-V-I**: the ii-V-I in all 12 major keys, in the classic practice order: C, Bb, Ab, Gb, E, D, B, A, G, F, Eb, Db. Each row, e.g. "Dm7 G7 Cmaj7", is added to the score with "+" or by drag and drop, and places its three chords there. Flat keys are spelled with flats, e.g. Bbmaj7.

### Partition (score)

Your chord progression, to play in order. The outlined chord is the **next one to play**. When you play it correctly, the score moves to the next chord, and loops back to the start after the last one.

- **Reorder**: drag a card.
- **Remove** a chord: hover its card and click "×".
- **Clear everything**: "Vider" (clear) button.
- **Make a chord active**: click its card. This also opens its menu.

The **chord menu** sets two things.

**Octave on the piano.** The "−" and "+" buttons move the chord down or up an octave on the piano, within the keyboard's range. The menu shows where the bass lands, e.g. "basse en C3" (bass on C3). This is a visual guide only: the chord is accepted in any octave. A shifted card shows a tag such as "+1 oct".

**Position.**

| Choice | On the piano and the card | What is accepted |
|---|---|---|
| Position libre (any position, default) | root position, plain name: "C" | the chord in any inversion |
| État fondamental (root position) | root position: "C" | only with the root in the bass |
| 1st, 2nd, 3rd inversion… | the inverted chord, with its bass: "C/E" | only with that note in the bass |

Close the menu with Escape or by clicking elsewhere.

### Piano

A keyboard from C2 to C7 showing what to play and what you are playing:

| Colour | Meaning |
|---|---|
| Light blue tint, with the note name | key of the target chord |
| Blue | pressed key, when there is no target |
| Green | pressed key that belongs to the target chord, in any octave |
| Red | pressed key that doesn't belong to the target chord |

The target chord is the one picked in the chord list if there is one, otherwise the active score chord. It is drawn around C3 by default, an octave below middle C. After a correct chord, keys you are still holding stay green while the score moves on to the next chord.

## Keyboard shortcuts

### Octave of the active chord

These are the same keys as in Ableton Live, matched by their physical position on the keyboard:

| Action | AZERTY | QWERTY |
|---|---|---|
| Move the active chord down an octave | <kbd>W</kbd> | <kbd>Z</kbd> |
| Move the active chord up an octave | <kbd>X</kbd> | <kbd>X</kbd> |

They act on the active score chord. They are ignored:

- while typing in the search field;
- when the target chord comes from the chord list;
- with <kbd>Cmd</kbd>, <kbd>Ctrl</kbd> or <kbd>Alt</kbd>, so that <kbd>Cmd</kbd>+<kbd>Z</kbd> still means undo.

### Playing with the computer keyboard

The middle row plays the white keys from middle C (C4). The row above plays the black keys, like on a piano:

| Note | C | C# | D | D# | E | F | F# | G | G# | A | A# | B | C | C# | D |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| QWERTY | A | W | S | E | D | F | T | G | Y | H | U | J | K | O | L |
| AZERTY | Q | Z | S | E | D | F | T | G | Y | H | U | J | K | O | L |

These keys play nothing while you type in the search field.

### Menus

| Key | Action |
|---|---|
| <kbd>Escape</kbd> | close a score chord's menu |

## How chords are recognised

- **Octaves and doubled notes are ignored**: C E G C and C G E both count as C.
- **The lowest note gives the inversion**: E G C shows as "C/E".
- **A chord counts once the notes are stable**: the app waits until the held keys have not changed for 60 ms, since fingers never land at exactly the same time.
- **Lifting a finger doesn't create a new chord**: releasing one note of a held Cmaj7 doesn't show C.
- **Legato changes are followed**: if you put down the new chord before lifting the old one, old notes released within 300 ms count as a chord change.
- **At least 3 different notes are needed**.
- **Symmetric chords** (augmented, diminished sevenths) take the bass as root.
- **A seventh or ninth chord played without its fifth** is accepted as correct on the score.

Recognised chord types:

| Family | Chords |
|---|---|
| Triads | major, m, dim, aug, sus2, sus4 |
| Sevenths | 7, maj7, m7, m7b5, dim7, mMaj7, 7sus4 |
| Sixths | 6, m6 |
| Ninths | add9, madd9, 9, maj9, m9 |
| Without fifth | 7, maj7, m7, 9 played without the fifth |

When the same set of notes forms two chords, such as C6 and Am7, the bass decides.

## Browser support

| Browser | MIDI | Computer keyboard |
|---|---|---|
| Chrome, Edge | yes | yes |
| Firefox | yes, after granting permission | yes |
| Safari | no | yes |

MIDI goes through the Web MIDI API. It needs the page to be served locally, as with `npm run dev`, or over HTTPS.

## Data stored in the browser

Everything stays local, in the browser's storage. Nothing is sent anywhere.

- `pianotools.layout.v1`: the module layout.
- `pianotools.progression.v1`: the score, with each chord's position and octave.

Clearing the site's data resets everything.

## Development

```sh
npm run dev        # development server
npm test           # music logic tests (Vitest)
npm run typecheck  # TypeScript check
npm run build      # static build in dist/
```

Stack: TypeScript, React, Vite, Vitest. The grid uses react-grid-layout, drag and drop uses dnd-kit, and shared state uses Zustand.

### Structure

| Folder | Role |
|---|---|
| `src/music/` | Pure, tested music logic: chord library, identification, chord detector, score, ii-V-I. Independent of the UI. |
| `src/input/` | Note sources, Web MIDI and computer keyboard, brought together in `NoteInput`, plus keyboard shortcuts. |
| `src/state/` | State shared between modules (`store.ts`) and wiring of inputs to the detector (`engine.ts`). |
| `src/modules/` | One React component per dashboard module. |
| `src/dashboard/` | The grid, module frames and default layout. |

### Adding a module

1. Write the component in `src/modules/`.
2. Register it in `src/dashboard/Dashboard.tsx`.
3. Give it a default place in `src/dashboard/layout.ts`.

### Adding a chord type

Add a line to `CHORD_QUALITIES` in `src/music/chords.ts`: an id, the displayed symbol, a French name and the intervals in semitones from the root. The new type then shows up in the chord list, detection and the score.
