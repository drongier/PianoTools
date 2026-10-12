# Piano Tools

Outils pour travailler le piano avec un clavier MIDI, dans le navigateur.

Premier outil : un détecteur d'accords. Joue un accord, l'outil affiche son nom, sa qualité, son renversement et ses notes.

Stack : TypeScript, Phaser 3, Vite, Vitest.

## Lancer

```sh
npm install
npm run dev     # puis ouvrir l'URL affichée dans Chrome, Edge ou Firefox
npm test        # tests de la détection d'accords
npm run build   # build statique dans dist/
```

Le MIDI passe par l'API Web MIDI : Chrome, Edge et Firefox. Safari ne la supporte pas.
Sans piano, le clavier d'ordinateur sert de clavier de secours.

## Structure

- `src/input/` : toutes les sources de notes passent par `NoteInput` (Web MIDI, clavier d'ordinateur).
- `src/music/` : logique pure et testée. Bibliothèque d'accords sous forme de données, identification, détecteur d'accords.
- `src/scenes/` : scènes Phaser, une par outil.
