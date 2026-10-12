import Phaser from 'phaser';
import { NoteInput } from '../input/NoteInput';
import { connectWebMidi } from '../input/WebMidiSource';
import { connectComputerKeyboard } from '../input/KeyboardSource';
import { ChordDetector } from '../music/ChordDetector';
import { chordPitchClasses, identifiedChordName, identifyChord } from '../music/chords';
import { NOTE_NAMES, isBlackKey, noteNameWithOctave } from '../music/notes';

const LOW_NOTE = 36; // C2
const HIGH_NOTE = 96; // C7
const HISTORY_SIZE = 8;
const INVERSION_LABELS = ['état fondamental', '1er renversement', '2e renversement', '3e renversement'];

/** Plays nothing, judges nothing: shows which chord you are playing. */
export class ChordDetectorScene extends Phaser.Scene {
  private readonly notes = new NoteInput();
  private readonly detector = new ChordDetector();
  private keyboard!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private chordText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private heldText!: Phaser.GameObjects.Text;
  private historyText!: Phaser.GameObjects.Text;
  private readonly history: string[] = [];

  constructor() {
    super('chord-detector');
  }

  create(): void {
    const { width } = this.scale;
    const style = (size: number, color = '#e8e8f0') => ({ fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, color });

    this.statusText = this.add.text(20, 16, '', style(16, '#9aa0b4'));
    this.chordText = this.add.text(width / 2, 140, '—', style(96)).setOrigin(0.5);
    this.detailText = this.add.text(width / 2, 220, 'Joue un accord', style(22, '#c8c8ff')).setOrigin(0.5);
    this.heldText = this.add.text(width / 2, 270, '', style(18, '#9aa0b4')).setOrigin(0.5);
    this.historyText = this.add.text(width / 2, 350, '', style(20, '#6a6f80')).setOrigin(0.5);
    this.add.text(width / 2, 690, 'Clavier d’ordinateur : rangée Q/A S D F G H J K = touches blanches, rangée du dessus = noires',
      style(14, '#6a6f80')).setOrigin(0.5);
    this.keyboard = this.add.graphics();

    this.notes.onStatus((s) => this.statusText.setText(s));
    this.notes.onNoteOn((n) => { this.detector.noteOn(n, this.time.now); this.refreshHeld(); });
    this.notes.onNoteOff((n) => { this.detector.noteOff(n, this.time.now); this.refreshHeld(); });
    this.detector.onChord = (notes) => this.showChord(notes);

    void connectWebMidi(this.notes);
    const disconnect = connectComputerKeyboard(this.notes);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, disconnect);

    this.drawKeyboard();
  }

  update(time: number): void {
    this.detector.update(time);
  }

  private showChord(notes: number[]): void {
    const chord = identifyChord(notes);
    if (!chord) {
      this.chordText.setText('?');
      this.detailText.setText(`Accord inconnu : ${[...new Set(notes.map((n) => NOTE_NAMES[n % 12]))].join(' ')}`);
      return;
    }
    const name = identifiedChordName(chord);
    const inversion = INVERSION_LABELS[chord.inversion] ?? '';
    const spelled = chordPitchClasses(chord).map((pc) => NOTE_NAMES[pc]).join(' ');
    this.chordText.setText(name);
    this.detailText.setText(`${NOTE_NAMES[chord.root]} ${chord.quality.label} · ${inversion} · ${spelled}`);

    if (this.history[0] !== name) {
      this.history.unshift(name);
      this.history.length = Math.min(this.history.length, HISTORY_SIZE);
      this.historyText.setText(this.history.join('   '));
    }
  }

  private refreshHeld(): void {
    const held = this.detector.heldNotes();
    this.heldText.setText(held.map(noteNameWithOctave).join('  '));
    this.drawKeyboard();
  }

  private drawKeyboard(): void {
    const g = this.keyboard;
    g.clear();
    const { width } = this.scale;
    const whiteNotes: number[] = [];
    for (let n = LOW_NOTE; n <= HIGH_NOTE; n++) if (!isBlackKey(n)) whiteNotes.push(n);

    const margin = 20;
    const keyW = (width - margin * 2) / whiteNotes.length;
    const top = 440;
    const whiteH = 200;
    const blackW = keyW * 0.6;
    const blackH = whiteH * 0.62;
    const held = new Set(this.detector.heldNotes());

    const xOf = new Map<number, number>();
    whiteNotes.forEach((n, i) => {
      const x = margin + i * keyW;
      xOf.set(n, x);
      g.fillStyle(held.has(n) ? 0x6c8cff : 0xf4f4f8).fillRect(x, top, keyW - 2, whiteH);
      if (n === 60) g.fillStyle(0xb0b4c4).fillCircle(x + keyW / 2 - 1, top + whiteH - 14, 4);
    });
    for (let n = LOW_NOTE; n <= HIGH_NOTE; n++) {
      if (!isBlackKey(n)) continue;
      const leftX = xOf.get(n - 1)!;
      g.fillStyle(held.has(n) ? 0x6c8cff : 0x1c1c24).fillRect(leftX + keyW - blackW / 2 - 1, top, blackW, blackH);
    }
  }
}
