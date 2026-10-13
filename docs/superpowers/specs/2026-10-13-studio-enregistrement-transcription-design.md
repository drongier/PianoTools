# Studio : enregistrement et transcription en partition

Date : 2026-10-13
Statut : conception validée en discussion, en attente de relecture

## Objectif

Créer un outil qui aide à structurer des morceaux à partir d'improvisations. On enregistre ce qu'on joue au clavier MIDI, sur un tempo et une mesure fixés d'avance avec un métronome, et l'outil en tire une vraie partition de piano, sur deux portées.

Cette spécification couvre les deux premières étapes d'un projet en quatre :

1. **Enregistrement** : couvert ici.
2. **Transcription en partition**, corrigeable par des réglages : couvert ici.
3. Édition note par note de la transcription : conception séparée, plus tard.
4. Structuration : sections, assemblage de prises, export MusicXML. Conception séparée, plus tard.

### Critères de réussite

- On lance un enregistrement, on joue sur le métronome, on l'arrête : la prise est sauvegardée et sa partition s'affiche.
- Des croches et doubles croches jouées à peu près en place sont écrites comme telles, et des triolets joués volontairement sont écrits en triolets.
- Changer un réglage de transcription recalcule la partition aussitôt, sans perdre la prise brute.
- Les noms d'accords apparaissent au-dessus de la portée, quand l'accord change.
- La page Entraînement existante fonctionne exactement comme avant.

### Hors périmètre de cette version

- Édition note par note, et notation sur deux voix par portée.
- Lecture swing : les rythmes sont écrits tels qu'ils sont joués.
- Mesures composées, comme 6/8, et armure de clé.
- Utilisation de la pédale de sustain dans la transcription : elle est enregistrée, mais ignorée.
- Lecture audio de la partition, et export.

## 1. Pages et navigation

- L'appli a deux pages, choisies par deux onglets dans la barre du haut :
  - **Entraînement** : la page actuelle, avec ses modules, inchangée ;
  - **Studio** : la nouvelle page.
- **Adresses** : la page Entraînement est à `#/`, et la page Studio à `#/studio`. Le routage par « # » évite une erreur 404 de GitHub Pages au rechargement, et ne demande aucune bibliothèque.
- **Entrées partagées** : le MIDI et le clavier d'ordinateur sont branchés une seule fois pour toute l'appli, par le moteur existant. Changer de page ne reconnecte rien.
- **Mise en page du Studio**, fixe, sans grille déplaçable :
  - en haut, la barre de transport : tempo, mesure, métronome, bouton d'enregistrement et d'arrêt ;
  - à gauche, la liste des prises ;
  - au centre, la partition de la prise sélectionnée et ses réglages de transcription ;
  - en bas, un petit piano qui montre les touches enfoncées, en réutilisant le composant existant.

## 2. Enregistrement

### Réglages du transport

| Réglage | Valeurs | Défaut |
|---|---|---|
| Tempo | 40 à 240 à la noire | 90 |
| Mesure | 4/4, 3/4, 2/4 | 4/4 |
| Métronome | activé, désactivé | activé |

Ces réglages sont mémorisés pour la prise suivante. Le métronome joue un clic plus aigu sur le premier temps de chaque mesure.

### Déroulé

1. Un clic sur le bouton d'enregistrement lance une mesure de décompte au métronome, même si le métronome est désactivé pour l'enregistrement lui-même.
2. L'enregistrement commence sur le premier temps qui suit le décompte. C'est l'instant zéro de la prise.
3. Une note commencée dans le dernier demi-temps du décompte est ramenée à zéro, car c'est une anticipation. Les notes commencées avant sont ignorées.
4. Un nouveau clic sur le bouton arrête l'enregistrement. Les notes encore tenues se terminent à l'arrêt. La durée de la prise est arrondie à la mesure complète suivante.
5. Une prise sans aucune note n'est pas sauvegardée, et un message le signale.
6. Quitter la page Studio pendant un enregistrement l'arrête et sauvegarde la prise.

### Timing

- Le métronome est programmé sur l'horloge audio du navigateur, avec un ordonnancement anticipé des clics.
- Chaque événement de note porte son heure. Pour le MIDI, c'est l'heure de l'événement MIDI. Pour le clavier d'ordinateur, c'est l'heure de l'événement clavier.
- Les heures des notes sont converties dans le repère de l'horloge audio, en tenant compte de la latence de sortie audio, pour que les notes et les clics soient alignés.
- Le module d'entrée transmet donc désormais l'heure de chaque note. Le changement reste compatible avec la page Entraînement.

### Contenu d'une prise

| Champ | Contenu |
|---|---|
| Identifiant | unique |
| Nom | modifiable, par défaut « Prise N · 13 oct. 14:32 » |
| Date de création | date et heure de l'enregistrement |
| Tempo et mesure | ceux du transport au moment de l'enregistrement |
| Durée | en mesures |
| Notes | hauteur MIDI, début et fin en millisecondes depuis l'instant zéro, vélocité |
| Pédale | changements de la pédale de sustain, avec leur heure et leur état |
| Réglages de transcription | voir la section 3 |

### Liste des prises

- Les prises les plus récentes sont en haut.
- On peut en sélectionner une, la renommer, ou la supprimer après confirmation.
- La nouvelle prise est sélectionnée automatiquement à la fin de l'enregistrement.

### Stockage

- Les prises et les réglages du transport sont gardés dans le navigateur, sous la clé `pianotools.studio.v1`.
- Une impro de 5 minutes pèse de l'ordre de 100 Ko, et la limite du navigateur est d'environ 5 Mo.
- Si l'écriture échoue faute de place, un message le signale. La prise reste disponible tant que la page est ouverte.

## 3. Transcription

### Réglages par prise

Ils sont modifiables après l'enregistrement, et la partition est recalculée aussitôt.

| Réglage | Valeurs | Défaut |
|---|---|---|
| Grille | croche, double croche | double croche |
| Triolets | activés, désactivés | activés |
| Séparation des mains | une note MIDI | C4, soit 60 |
| Altérations | dièses, bémols | dièses |
| Noms d'accords | affichés, masqués | affichés |

### Étapes

La transcription est une fonction pure : une prise et ses réglages donnent un modèle de partition.

1. **Conversion en temps.** Les millisecondes deviennent des temps, d'après le tempo de la prise.
2. **Choix d'une grille par temps.** Pour chaque temps, on compare la grille binaire, de 2 ou 4 subdivisions selon le réglage, et la grille en triolet, de 3 subdivisions, si les triolets sont activés. On garde la grille dont l'écart total avec les débuts de notes du temps est le plus faible. La grille binaire est favorisée par une marge, pour éviter des triolets parasites. Un temps sans début de note est binaire.
3. **Calage.** Chaque début de note est ramené au point le plus proche de la grille de son temps. Chaque fin est ramenée au point le plus proche de la grille du temps où elle tombe. Une note dure au moins un pas de grille.
4. **Répartition sur les portées.** Les notes à partir du point de séparation vont en clé de sol, les autres en clé de fa.
5. **Formation des accords.** Sur chaque portée, les notes qui commencent au même instant calé forment un accord. Sa durée va jusqu'à la fin la plus tardive de ses notes, pour qu'un voicing tenu reste tenu, ou jusqu'au début suivant sur la même portée s'il arrive avant. Cette version n'a qu'une voix par portée : une note tenue sous des notes qui bougent est raccourcie.
6. **Silences.** Les intervalles vides de chaque portée deviennent des silences.
7. **Découpage en valeurs écrivables.** Les durées sont découpées en ronde, blanche, noire, croche et double croche, pointées comprises. Elles sont découpées aux barres de mesure, avec une liaison pour les notes. Un temps en triolet est écrit en croches de triolet. Une note qui sort d'un temps en triolet est découpée et liée à la limite du temps.
8. **Noms d'accords.** Pour chaque temps, les notes qui sonnent au début du temps ou qui commencent pendant ce temps, sur les deux portées, sont passées à la détection d'accords existante. Le nom s'affiche quand il change par rapport au temps précédent. Rien ne s'affiche si l'accord n'est pas reconnu. Le nom suit le réglage des altérations.
9. **Orthographe.** Les notes altérées sont écrites en dièses ou en bémols selon le réglage, sans armure.

### Modèle de partition

Le modèle est indépendant de l'affichage, pour servir plus tard à l'export MusicXML. Il contient :

- le titre, le tempo et la mesure ;
- une liste de mesures, chacune avec deux portées ;
- pour chaque portée, une suite d'éléments : note ou accord, ou silence, avec sa durée écrite, un éventuel groupe de triolet et une éventuelle liaison vers l'élément suivant ;
- les noms d'accords, rattachés à une mesure et à un temps.

## 4. Affichage de la partition

- Le modèle est converti en texte ABC : une grande portée de piano, avec le nom de la prise en titre, le tempo, la mesure et les noms d'accords au-dessus de la portée du haut.
- La bibliothèque abcjs dessine le texte ABC dans la page, en SVG, avec ses retours à la ligne automatiques.
- Si abcjs signale une erreur, un message remplace la partition. La prise n'est pas touchée.
- Les couleurs de la partition suivent le thème sombre de l'appli.

## 5. Organisation du code

| Emplacement | Rôle |
|---|---|
| `src/App.tsx` | barre du haut avec les onglets, choix de la page selon l'adresse |
| `src/pages/TrainingPage.tsx` | la page Entraînement actuelle, déplacée sans changement |
| `src/pages/StudioPage.tsx` | la page Studio |
| `src/input/` | le module d'entrée transmet l'heure de chaque note et de la pédale |
| `src/studio/recorder.ts` | logique pure de l'enregistrement : décompte, anticipation, arrêt, production d'une prise |
| `src/studio/metronome.ts` | métronome sur l'horloge audio, et conversion entre horloges |
| `src/studio/transcribe.ts` | logique pure de la transcription, de la prise au modèle de partition |
| `src/studio/score.ts` | types du modèle de partition |
| `src/studio/abc.ts` | conversion du modèle en texte ABC |
| `src/studio/store.ts` | état du Studio : prises, transport, prise sélectionnée, sauvegarde |
| `src/studio/components/` | barre de transport, liste des prises, partition, réglages |

Le moteur existant reste le seul point de branchement des entrées. Il expose les événements de note et de pédale horodatés, que le Studio écoute pendant un enregistrement.

## 6. Tests

### Tests unitaires

- **Enregistreur** : instant zéro après le décompte, anticipation ramenée à zéro, notes du décompte ignorées, notes tenues fermées à l'arrêt, durée arrondie à la mesure, prise vide refusée.
- **Transcription** :
  - croches et doubles croches légèrement décalées, calées sur la bonne grille ;
  - triolets joués, reconnus comme triolets, et grille binaire gardée en cas de doute ;
  - note qui dépasse une barre de mesure, découpée et liée ;
  - séparation des mains au point réglé ;
  - accord formé par des notes simultanées ;
  - silences en début de mesure et entre les notes ;
  - noms d'accords affichés seulement quand ils changent ;
  - dièses et bémols selon le réglage.
- **Conversion en ABC** : texte attendu pour de petits modèles, avec deux portées, triolets, liaisons, silences et noms d'accords.

### Vérification dans le navigateur

Avec Chrome piloté par script, au clavier d'ordinateur :

- enregistrer quelques mesures et vérifier que la prise apparaît, sélectionnée, avec sa partition ;
- changer la grille et les altérations, et vérifier que la partition change ;
- renommer et supprimer une prise ;
- vérifier que la page Entraînement fonctionne toujours, et que les adresses `#/` et `#/studio` mènent aux bonnes pages, y compris après rechargement.
