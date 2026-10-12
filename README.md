# Piano Tools

Outils pour travailler le piano avec un clavier MIDI, dans le navigateur.

Un tableau de bord de modules déplaçables et redimensionnables (on les attrape par leur titre, on les agrandit par le coin en bas à droite) :

- **Accord joué** : nom, qualité, renversement et notes de l'accord que tu joues.
- **Historique** : les accords joués, le plus récent en haut.
- **Accords** : la liste de tous les accords, avec recherche et filtre par fondamentale. Un clic affiche l'accord sur le piano.
- **Partition** : glisse des accords depuis la liste (ou clique sur +) pour composer une suite. L'accord en surbrillance est le prochain à jouer ; le jouer correctement passe au suivant. Un clic sur un accord ouvre un menu pour choisir sa position (fondamental, renversements, ou position libre) : avec une position imposée, il faut jouer la bonne basse. Le même menu monte ou descend l'accord d'une octave sur le piano ; c'est un repère visuel, l'accord est validé dans toutes les octaves. Raccourcis comme dans Ableton, sur l'accord actif : W / X sur un clavier AZERTY (Z / X en QWERTY).
- **Piano** : les touches de l'accord cible sont teintées ; tes touches passent au vert si elles sont justes, au rouge sinon.

La disposition et la partition sont gardées dans le navigateur.

Stack : TypeScript, React, Vite, Vitest, react-grid-layout (grille), dnd-kit (glisser-déposer), Zustand (état partagé).

## Lancer

```sh
npm install
npm run dev     # puis ouvrir l'URL affichée dans Chrome, Edge ou Firefox
npm test        # tests de la logique musicale
npm run build   # build statique dans dist/
```

Le MIDI passe par l'API Web MIDI : Chrome, Edge et Firefox. Safari ne la supporte pas.
Sans piano, le clavier d'ordinateur sert de clavier de secours.

## Structure

- `src/input/` : toutes les sources de notes passent par `NoteInput` (Web MIDI, clavier d'ordinateur).
- `src/music/` : logique pure et testée. Bibliothèque d'accords sous forme de données, identification, détecteur d'accords, partition.
- `src/state/` : état partagé entre modules (`store.ts`) et branchement des entrées sur le détecteur (`engine.ts`).
- `src/modules/` : un composant React par module.
- `src/dashboard/` : la grille. Pour ajouter un module, l'enregistrer dans `Dashboard.tsx` et lui donner une place par défaut dans `layout.ts`.
