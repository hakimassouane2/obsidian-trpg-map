# Guide d'implémentation : Plugin Obsidian de Cartes Interactives pour JDR

## Vue d'ensemble du projet

Ce document décrit les spécifications pour créer un plugin Obsidian permettant de gérer des cartes interactives pour le jeu de rôle, inspiré du système de cartes de LegendKeeper.

### Objectif principal

Créer un plugin Obsidian qui permet d'afficher des cartes (images) avec des pins interactifs, un zoom fluide, et la possibilité de lier chaque pin à une note Obsidian.

### Contexte d'utilisation

- L'utilisateur synchronise son vault Obsidian entre plusieurs machines (PC fixe Windows + Mac) via Syncthing
- Les cartes peuvent être de grande taille (4000x4000 pixels et plus)
- Le plugin doit fonctionner de manière fluide sans dépendance serveur externe

---

## Fonctionnalités requises

### 1. Affichage de carte

- **Import d'image** : Supporter les formats PNG, JPG, WEBP
- **Zoom fluide** : Zoom in/out avec molette souris, gestes trackpad, ou boutons +/-
- **Pan (déplacement)** : Drag & drop pour naviguer sur la carte
- **Qualité préservée** : La carte doit rester nette à tous les niveaux de zoom
- **Grille optionnelle** : Affichage d'une grille en arrière-plan (toggle on/off)

### 2. Système de tuiles (Tiling)

Pour garantir des performances optimales sur les grandes cartes, implémenter un système de tuiles :

#### Architecture des tuiles

```
vault/
├── .map-cache/           # Dossier ignoré par Syncthing (généré localement)
│   └── nom-de-la-map/
│       ├── 0/            # Zoom level 0 (le plus dézoomé)
│       │   └── 0_0.png
│       ├── 1/            # Zoom level 1
│       │   ├── 0_0.png
│       │   ├── 0_1.png
│       │   ├── 1_0.png
│       │   └── 1_1.png
│       ├── 2/            # Zoom level 2
│       │   └── ...
│       └── metadata.json
├── Maps/                 # Dossier synchronisé
│   ├── waterdeep.png     # Image source originale
│   └── waterdeep.map.md  # Fichier de configuration de la map
```

#### Génération des tuiles

- Utiliser **Sharp** (librairie Node.js) pour le traitement d'images
- Taille de tuile standard : 256x256 pixels
- Génération **lazy** : ne générer que les niveaux de zoom utilisés
- Stocker les tuiles dans un dossier `.map-cache/` à la racine du vault
- Ce dossier doit être ajouté au `.stignore` de Syncthing

#### Métadonnées des tuiles (metadata.json)

```json
{
  "sourceImage": "Maps/waterdeep.png",
  "sourceHash": "sha256:abc123...",
  "originalWidth": 4096,
  "originalHeight": 4096,
  "tileSize": 256,
  "maxZoom": 4,
  "generatedLevels": [0, 1, 2],
  "generatedAt": "2025-01-15T10:30:00Z"
}
```

### 3. Système de Pins

#### Création de pin

- **Clic droit** sur la carte → Menu contextuel avec "New pin" / "Pin existing"
- **Modal de création** avec les champs :
  - Nom du pin (texte)
  - Type/Forme (voir section suivante)
  - Couleur
  - Icône
  - Lien vers une note Obsidian

#### Formes de pins disponibles

```
- Cercle (défaut)
- Losange
- Bouclier/Blason
- Carré
- Drapeau
- Marqueur classique (goutte inversée)
- Rectangle vertical
- Hexagone
```

#### Palette de couleurs

Proposer une palette prédéfinie de 18-24 couleurs + possibilité de couleurs custom :

```javascript
const defaultColors = [
  // Neutres
  '#FFFFFF', '#9CA3AF', '#6B7280',
  // Cyan/Teal
  '#5EEAD4', '#2DD4BF', '#14B8A6',
  // Bleu
  '#60A5FA', '#3B82F6', '#2563EB',
  // Violet
  '#A78BFA', '#8B5CF6', '#7C3AED',
  // Rose/Rouge
  '#F472B6', '#EC4899', '#DC2626',
  // Orange/Jaune
  '#FB923C', '#F59E0B', '#FBBF24',
  // Vert
  '#4ADE80', '#22C55E', '#16A34A',
];
```

#### Icônes

- Intégrer une bibliothèque d'icônes (Lucide Icons recommandé - déjà utilisé par Obsidian)
- Permettre la recherche d'icônes par nom
- Supporter les emojis comme alternative

#### Stockage des pins

Les pins sont stockés dans le fichier `.map.md` de la carte :

```markdown
---
map-image: waterdeep.png
map-width: 4096
map-height: 4096
default-zoom: 1
pins:
  - id: pin-001
    name: "Taverne du Dragon"
    x: 1250
    y: 890
    shape: circle
    color: "#F59E0B"
    icon: beer
    link: "[[Lieux/Taverne du Dragon]]"
  - id: pin-002
    name: "Château de Waterdeep"
    x: 2100
    y: 1500
    shape: shield
    color: "#3B82F6"
    icon: castle
    link: "[[Lieux/Château de Waterdeep]]"
---

# Carte de Waterdeep

Notes additionnelles sur la carte...
```

### 4. Clustering des pins

Quand il y a beaucoup de pins et qu'on est dézoomé :

- Regrouper les pins proches en clusters
- Afficher un nombre sur le cluster (ex: "5" pour 5 pins regroupés)
- Au clic sur un cluster : zoomer pour voir les pins individuels
- Seuil de clustering configurable (distance en pixels)

### 5. Interaction avec les pins

- **Hover** : Afficher un tooltip avec le nom du pin
- **Clic gauche** : Ouvrir la note liée dans Obsidian (si lien existe)
- **Clic droit** : Menu contextuel (Éditer, Supprimer, Copier le lien)
- **Drag & drop** : Déplacer le pin sur la carte

### 6. Liaison avec les notes Obsidian

#### Lier un pin à une note existante

- Modal de recherche de notes (comme le link suggester d'Obsidian)
- Afficher les notes récentes
- Recherche par nom de fichier

#### Créer une nouvelle note depuis un pin

- Option "Créer une nouvelle note"
- Utiliser un template configurable
- Créer la note dans un dossier configurable

#### Backlinks

- Dans une note liée à un pin, afficher un bloc "Apparaît sur les cartes : [Carte de Waterdeep]"
- Permettre de naviguer vers la carte depuis la note

---

## Architecture technique

### Stack technologique

```
Plugin Obsidian (TypeScript)
├── Leaflet.js (CRS.Simple pour images custom)
├── Leaflet.markercluster (clustering)
├── Sharp (génération de tuiles - Node.js natif)
└── Obsidian API (intégration vault)
```

### Structure du plugin

```
obsidian-interactive-maps/
├── src/
│   ├── main.ts                 # Point d'entrée du plugin
│   ├── MapView.ts              # Vue principale Leaflet
│   ├── PinManager.ts           # Gestion des pins (CRUD)
│   ├── TileGenerator.ts        # Génération des tuiles avec Sharp
│   ├── TileLayer.ts            # Layer Leaflet custom pour les tuiles
│   ├── ClusterManager.ts       # Gestion du clustering
│   ├── modals/
│   │   ├── CreatePinModal.ts   # Modal création de pin
│   │   ├── EditPinModal.ts     # Modal édition de pin
│   │   ├── IconPickerModal.ts  # Sélecteur d'icônes
│   │   ├── ColorPickerModal.ts # Sélecteur de couleurs
│   │   └── LinkPageModal.ts    # Sélecteur de note à lier
│   ├── components/
│   │   ├── PinMarker.ts        # Composant pin custom
│   │   └── ClusterMarker.ts    # Composant cluster
│   ├── utils/
│   │   ├── coordinates.ts      # Conversion coordonnées image ↔ Leaflet
│   │   └── hash.ts             # Hash des images pour cache
│   └── settings.ts             # Page de settings du plugin
├── styles/
│   └── styles.css              # Styles du plugin
├── manifest.json
├── package.json
└── esbuild.config.mjs
```

### Configuration Leaflet pour images

```typescript
import L from 'leaflet';

// CRS.Simple pour les images (pas de projection géographique)
const map = L.map('map-container', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 0.25,        // Zoom fluide par incréments de 0.25
  zoomDelta: 0.5,        // Delta de zoom à la molette
  wheelPxPerZoomLevel: 120,
});

// Bounds de l'image
const bounds: L.LatLngBoundsExpression = [
  [0, 0],                        // Sud-Ouest (coin bas-gauche)
  [imageHeight, imageWidth]      // Nord-Est (coin haut-droit)
];

// Contraindre la vue à l'image
map.setMaxBounds(bounds);
map.fitBounds(bounds);
```

### Génération de tuiles avec Sharp

```typescript
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

interface TileConfig {
  sourceImage: string;
  outputDir: string;
  tileSize: number;
}

async function generateTiles(config: TileConfig): Promise<void> {
  const { sourceImage, outputDir, tileSize } = config;
  
  const image = sharp(sourceImage);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  
  // Calculer le nombre de niveaux de zoom
  const maxDimension = Math.max(width!, height!);
  const maxZoom = Math.ceil(Math.log2(maxDimension / tileSize));
  
  for (let zoom = 0; zoom <= maxZoom; zoom++) {
    const scale = Math.pow(2, zoom - maxZoom);
    const scaledWidth = Math.floor(width! * scale);
    const scaledHeight = Math.floor(height! * scale);
    
    const tilesX = Math.ceil(scaledWidth / tileSize);
    const tilesY = Math.ceil(scaledHeight / tileSize);
    
    const zoomDir = path.join(outputDir, String(zoom));
    await fs.mkdir(zoomDir, { recursive: true });
    
    // Redimensionner l'image pour ce niveau de zoom
    const scaledImage = sharp(sourceImage)
      .resize(scaledWidth, scaledHeight);
    
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const left = x * tileSize;
        const top = y * tileSize;
        
        await scaledImage
          .clone()
          .extract({
            left,
            top,
            width: Math.min(tileSize, scaledWidth - left),
            height: Math.min(tileSize, scaledHeight - top),
          })
          .toFile(path.join(zoomDir, `${x}_${y}.png`));
      }
    }
  }
}
```

### Custom TileLayer pour Leaflet

```typescript
import L from 'leaflet';

class LocalTileLayer extends L.TileLayer {
  private basePath: string;
  
  constructor(basePath: string, options?: L.TileLayerOptions) {
    super('', options);
    this.basePath = basePath;
  }
  
  getTileUrl(coords: L.Coords): string {
    const { x, y, z } = coords;
    // Retourner le chemin local vers la tuile
    return `app://local/${this.basePath}/${z}/${x}_${y}.png`;
  }
}
```

---

## Interface utilisateur

### Vue principale de la carte

```
┌─────────────────────────────────────────────────────────────┐
│ [Tabs: Carte 1 | Carte 2 | + Add Tab]                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    [CARTE INTERACTIVE]                      │
│                                                             │
│                         📍 Pin                              │
│                    📍        📍                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [🔍-] [🔍+]  Zoom: 75%                              [?]     │
└─────────────────────────────────────────────────────────────┘
```

### Modal de création de pin

```
┌─────────────────────────────────────────┐
│              Create pin            [X]  │
├─────────────────────────────────────────┤
│                                         │
│              [ICON PREVIEW]             │
│                                         │
│  [📍] Pin name                          │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Type      [● Icon    ▼]                │
│            ┌─────────────────────┐      │
│            │ ● ◆ ⬡ ◼ 🏴 📍      │      │
│            └─────────────────────┘      │
│                                         │
│  Style     [■ Color   ▼]                │
│            ┌─────────────────────┐      │
│            │ [Palette couleurs]  │      │
│            └─────────────────────┘      │
│                                         │
│  Link      [+ Add]                      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        Create pin    Ctrl+↵    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Settings du plugin

```typescript
interface MapPluginSettings {
  // Dossier de cache des tuiles
  cacheFolder: string;  // default: '.map-cache'
  
  // Taille des tuiles
  tileSize: number;  // default: 256
  
  // Dossier par défaut pour les nouvelles notes créées depuis un pin
  defaultNoteFolder: string;  // default: ''
  
  // Template pour les nouvelles notes
  noteTemplate: string;  // default: ''
  
  // Seuil de clustering (distance en pixels)
  clusterThreshold: number;  // default: 80
  
  // Activer/désactiver le clustering
  enableClustering: boolean;  // default: true
  
  // Niveau de zoom par défaut
  defaultZoom: number;  // default: 0
  
  // Afficher la grille
  showGrid: boolean;  // default: false
}
```

---

## Workflow utilisateur

### Créer une nouvelle carte

1. Créer un fichier `.map.md` dans le vault
2. Ajouter le frontmatter avec `map-image: chemin/vers/image.png`
3. Ouvrir le fichier → le plugin détecte l'extension et affiche la vue carte
4. Si les tuiles n'existent pas, elles sont générées automatiquement

### Ajouter un pin

1. Clic droit sur la carte
2. Sélectionner "New pin"
3. Remplir le formulaire (nom, forme, couleur, icône)
4. Optionnel : lier à une note existante ou en créer une nouvelle
5. Cliquer "Create pin"

### Naviguer vers une note depuis la carte

1. Cliquer sur un pin
2. Si le pin a un lien, la note s'ouvre dans un nouveau panneau

### Naviguer vers la carte depuis une note

1. Dans une note liée à un pin, un bloc affiche "Visible sur : [Carte X]"
2. Cliquer sur le lien ouvre la carte et centre sur le pin

---

## Gestion des erreurs

### Image source non trouvée

```typescript
if (!await this.app.vault.adapter.exists(mapImagePath)) {
  // Afficher un message d'erreur dans la vue
  this.showError(`Image non trouvée : ${mapImagePath}`);
}
```

### Échec de génération des tuiles

```typescript
try {
  await this.tileGenerator.generate(imagePath, cachePath);
} catch (error) {
  // Fallback : afficher l'image entière sans tuiles
  this.loadImageWithoutTiles(imagePath);
  new Notice(`Erreur lors de la génération des tuiles. Mode dégradé activé.`);
}
```

### Cache corrompu

- Vérifier le hash de l'image source vs le hash stocké dans metadata.json
- Si différent, regénérer les tuiles

---

## Optimisations de performance

### Lazy loading des tuiles

- Ne charger que les tuiles visibles à l'écran
- Pré-charger les tuiles adjacentes (buffer d'une tuile autour)
- Utiliser un cache LRU pour les tuiles en mémoire

### Debounce des sauvegardes

- Ne pas sauvegarder le fichier .map.md à chaque micro-modification
- Debounce de 500ms après la dernière modification

### Web Workers

- Optionnel : générer les tuiles dans un Web Worker pour ne pas bloquer l'UI

---

## Tests recommandés

### Tests unitaires

- Conversion de coordonnées (image ↔ Leaflet)
- Parsing/serialization du frontmatter YAML
- Calcul des niveaux de zoom

### Tests d'intégration

- Création d'un pin et vérification de la sauvegarde
- Génération des tuiles et vérification des fichiers
- Clustering avec différents nombres de pins

### Tests manuels

- Performance avec une carte 8000x8000 pixels
- Performance avec 500+ pins
- Synchronisation entre deux machines (vérifier que .map-cache est bien ignoré)

---

## Références

### Librairies à utiliser

- **Leaflet** : https://leafletjs.com/
- **Leaflet.markercluster** : https://github.com/Leaflet/Leaflet.markercluster
- **Sharp** : https://sharp.pixelplumbing.com/
- **Lucide Icons** : https://lucide.dev/

### Ressources Obsidian

- **Plugin API** : https://docs.obsidian.md/
- **Sample Plugin** : https://github.com/obsidianmd/obsidian-sample-plugin

### Inspiration

- **LegendKeeper** : https://www.legendkeeper.com/ (système de cartes de référence)
- **Leaflet-Obsidian** : Plugin existant (à éviter ses erreurs de conception)

---

## Notes pour l'implémentation

### Priorité des fonctionnalités

1. **MVP** : Affichage carte + zoom/pan + pins basiques + sauvegarde YAML
2. **V1** : Tiling + clustering + modals complets + liens notes
3. **V2** : Tabs multiples + backlinks + templates

### Points d'attention

- Le plugin doit fonctionner en mode "sandbox" d'Obsidian
- Tester sur Windows ET macOS
- Gérer les chemins de fichiers de manière cross-platform
- Sharp peut avoir des problèmes avec certaines versions de Node - prévoir un fallback
