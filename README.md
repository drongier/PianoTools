# Piano Tools

Un tableau de bord dans le navigateur pour travailler ses accords au piano. Branche un clavier MIDI, joue : l'outil reconnaît l'accord, te montre quoi jouer sur un piano à l'écran et te fait avancer dans une suite d'accords, comme une partition.

Pas de piano sous la main ? Le clavier de l'ordinateur sert de clavier de secours.

## Démarrage rapide

```sh
npm install
npm run dev
```

Ouvre l'adresse affichée dans **Chrome** ou **Edge** (Firefox fonctionne aussi), branche ton clavier MIDI et accepte l'accès MIDI quand le navigateur le demande. Le nom de l'appareil s'affiche en haut de la page une fois connecté.

## Le tableau de bord

L'écran est une grille de modules que tu organises comme tu veux :

- **Déplacer** un module : attrape-le par sa barre de titre.
- **Redimensionner** : tire le coin en bas à droite.
- **Revenir à la disposition d'origine** : bouton « Réinitialiser la disposition » en haut à droite.

La disposition est gardée dans le navigateur d'une visite à l'autre.

## Les modules

### Accord joué

Affiche en grand le dernier accord joué, avec :

- sa qualité et son renversement, par exemple « C majeur · 1er renversement · C E G » ;
- les notes tenues avec leur octave, par exemple « E4 G4 C5 » ;
- l'accord à jouer, sous la mention « Cible ».

Un flash vert confirme quand tu joues l'accord cible correctement. Si les notes ne forment aucun accord connu, le module affiche « ? » et liste les notes.

### Historique

La liste des accords joués, le plus récent en haut et en plus gros. Un même accord joué plusieurs fois de suite n'apparaît qu'une fois. La liste défile et garde les 200 derniers accords.

### Accords

La bibliothèque d'accords, en deux onglets.

**Tous les accords** : les 12 fondamentales combinées à 20 types d'accords.

- **Rechercher** par nom ou par type : « Am7 », « sus4 », « mineur »… Les bémols sont compris : « Bbm7 » trouve A#m7.
- **Filtrer** par fondamentale avec les pastilles C, C#, D…
- **Cliquer sur un accord** l'affiche sur le piano comme cible. Recliquer dessus l'enlève.
- **« + »** ajoute l'accord à la fin de la partition.
- **Glisser un accord** sur la partition le place à l'endroit voulu.

**ii-V-I** : les ii-V-I des 12 tonalités majeures, dans l'ordre de travail classique : C, Bb, Ab, Gb, E, D, B, A, G, F, Eb, Db. Chaque ligne, par exemple « Dm7 G7 Cmaj7 », s'ajoute à la partition avec « + » ou par glisser-déposer, et y pose ses trois accords. Les tonalités bémolisées sont écrites en bémols, comme Bbmaj7.

### Partition

Ta suite d'accords, à jouer dans l'ordre. L'accord encadré est le **prochain à jouer**. Quand tu le joues juste, la partition passe au suivant, puis reprend au début après le dernier.

- **Réordonner** : fais glisser une carte.
- **Retirer** un accord : survole sa carte et clique sur « × ».
- **Tout effacer** : bouton « Vider ».
- **Choisir l'accord actif** : clique sur sa carte. Ça ouvre aussi son menu.

Le **menu d'un accord** règle deux choses.

**L'octave sur le piano.** Les boutons « − » et « + » montent ou descendent l'accord d'une octave sur le piano, dans les limites du clavier. Le menu indique où tombe la basse, par exemple « basse en C3 ». C'est un repère visuel : l'accord est validé dans toutes les octaves. Une carte décalée porte une mention, comme « +1 oct ».

**La position.**

| Choix | Sur le piano et la carte | Ce qui est accepté |
|---|---|---|
| Position libre (par défaut) | position fondamentale, nom simple : « C » | l'accord dans n'importe quel renversement |
| État fondamental | position fondamentale : « C » | seulement avec la fondamentale à la basse |
| 1er, 2e, 3e renversement… | l'accord renversé, avec sa basse : « C/E » | seulement avec cette note à la basse |

Le menu se ferme avec Échap ou en cliquant ailleurs.

### Piano

Un clavier de C2 à C7 qui montre ce qu'il faut jouer et ce que tu joues :

| Couleur | Signification |
|---|---|
| Teinte bleu clair, avec le nom de la note | touche de l'accord cible |
| Bleu | touche enfoncée, quand il n'y a pas de cible |
| Vert | touche enfoncée qui appartient à l'accord cible, dans n'importe quelle octave |
| Rouge | touche enfoncée qui n'appartient pas à l'accord cible |

L'accord cible est celui choisi dans la liste s'il y en a un, sinon l'accord actif de la partition. Il s'affiche par défaut autour de C3, une octave sous le C central. Après un accord réussi, les touches encore enfoncées restent vertes pendant que la partition passe à l'accord suivant.

## Raccourcis clavier

### Octave de l'accord actif

Ce sont les mêmes touches que dans Ableton Live, repérées par leur position physique sur le clavier :

| Action | AZERTY | QWERTY |
|---|---|---|
| Descendre l'accord actif d'une octave | <kbd>W</kbd> | <kbd>Z</kbd> |
| Monter l'accord actif d'une octave | <kbd>X</kbd> | <kbd>X</kbd> |

Ils agissent sur l'accord actif de la partition. Ils sont ignorés :

- pendant la saisie dans la recherche ;
- quand l'accord cible vient de la liste ;
- avec <kbd>Cmd</kbd>, <kbd>Ctrl</kbd> ou <kbd>Alt</kbd>, pour que <kbd>Cmd</kbd>+<kbd>Z</kbd> garde son rôle habituel.

### Jouer au clavier d'ordinateur

La rangée du milieu joue les touches blanches à partir du C central (C4). La rangée du dessus joue les touches noires, comme sur un piano :

| Note | C | C# | D | D# | E | F | F# | G | G# | A | A# | B | C | C# | D |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AZERTY | Q | Z | S | E | D | F | T | G | Y | H | U | J | K | O | L |
| QWERTY | A | W | S | E | D | F | T | G | Y | H | U | J | K | O | L |

Ces touches ne jouent rien pendant la saisie dans la recherche.

### Menus

| Touche | Action |
|---|---|
| <kbd>Échap</kbd> | fermer le menu d'un accord de la partition |

## Comment les accords sont reconnus

- **Les octaves et doublures sont ignorées** : C E G C et C G E sonnent tous comme C.
- **La note la plus grave donne le renversement** : E G C s'affiche « C/E ».
- **Un accord compte quand les notes sont stables** : l'outil attend que les touches enfoncées ne changent plus pendant 60 ms. Les doigts n'arrivent jamais exactement en même temps.
- **Lever un doigt ne crée pas un nouvel accord** : relâcher une note d'un Cmaj7 tenu n'affiche pas C.
- **Les enchaînements legato sont suivis** : si tu poses le nouvel accord avant d'avoir levé l'ancien, les notes de l'ancien relâchées dans les 300 ms comptent comme un changement d'accord.
- **Il faut au moins 3 notes différentes**.
- **Les accords symétriques** (augmentés, septièmes diminuées) prennent la basse comme fondamentale.
- **Une septième ou une neuvième jouée sans sa quinte** est acceptée comme juste dans la partition.

Types d'accords reconnus :

| Famille | Accords |
|---|---|
| Triades | majeur, m, dim, aug, sus2, sus4 |
| Septièmes | 7, maj7, m7, m7b5, dim7, mMaj7, 7sus4 |
| Sixtes | 6, m6 |
| Neuvièmes | add9, madd9, 9, maj9, m9 |
| Sans quinte | 7, maj7, m7, 9 joués sans la quinte |

Quand le même ensemble de notes donne deux accords, comme C6 et Am7, la basse décide.

## Compatibilité

| Navigateur | MIDI | Clavier d'ordinateur |
|---|---|---|
| Chrome, Edge | oui | oui |
| Firefox | oui, après autorisation | oui |
| Safari | non | oui |

Le MIDI passe par l'API Web MIDI. Elle demande une page servie en local, comme avec `npm run dev`, ou en HTTPS.

## Données gardées dans le navigateur

Tout reste en local, dans le stockage du navigateur. Rien n'est envoyé nulle part.

- `pianotools.layout.v1` : la disposition des modules.
- `pianotools.progression.v1` : la partition, avec la position et l'octave de chaque accord.

Vider les données du site remet tout à zéro.

## Développement

```sh
npm run dev        # serveur de développement
npm test           # tests de la logique musicale (Vitest)
npm run typecheck  # vérification TypeScript
npm run build      # build statique dans dist/
```

Stack : TypeScript, React, Vite, Vitest. La grille utilise react-grid-layout, le glisser-déposer dnd-kit, et l'état partagé Zustand.

### Structure

| Dossier | Rôle |
|---|---|
| `src/music/` | Logique musicale pure et testée : bibliothèque d'accords, identification, détecteur d'accords, partition, ii-V-I. Ne dépend pas de l'interface. |
| `src/input/` | Sources de notes, Web MIDI et clavier d'ordinateur, réunies dans `NoteInput`, plus les raccourcis clavier. |
| `src/state/` | État partagé entre modules (`store.ts`) et branchement des entrées sur le détecteur (`engine.ts`). |
| `src/modules/` | Un composant React par module du tableau de bord. |
| `src/dashboard/` | La grille, les cadres des modules et la disposition par défaut. |

### Ajouter un module

1. Écris le composant dans `src/modules/`.
2. Enregistre-le dans `src/dashboard/Dashboard.tsx`.
3. Donne-lui une place par défaut dans `src/dashboard/layout.ts`.

### Ajouter un type d'accord

Ajoute une ligne dans `CHORD_QUALITIES`, dans `src/music/chords.ts` : un identifiant, le symbole affiché, un nom en français et les intervalles en demi-tons depuis la fondamentale. Le nouveau type apparaît alors dans la liste, la détection et la partition.
