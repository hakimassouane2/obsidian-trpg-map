# Project Context for AI Agents

> **Project:** obsidian-trpg-maps  
> **Type:** Obsidian Plugin (TypeScript)  
> **Created:** 2025-12-26  
> **Status:** V1 COMPLETE ✅  
> **MVP Completed:** 2025-12-26  
> **V1 Completed:** 2025-12-26

_This file contains critical rules and patterns that AI agents must follow when implementing code. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.x (strict) | Primary language |
| Obsidian API | Latest | Plugin host |
| Leaflet.js | Latest stable | Map rendering |
| leaflet.markercluster | 1.5.3 | Pin clustering |
| Zod | Latest stable | Runtime validation |
| esbuild | Via starter | Bundling |

---

## Critical Rules (MUST Follow)

### 1. File Operations

```typescript
// ✅ ALWAYS use Obsidian Vault API
const file = this.app.vault.getAbstractFileByPath(path);
await this.app.vault.read(file as TFile);
await this.app.vault.modify(file as TFile, content);

// ❌ NEVER use Node.js fs module
import * as fs from 'fs'; // FORBIDDEN
```

### 2. Coordinate Conversion

```typescript
// ✅ ALWAYS use utility functions from utils/coordinates.ts
import { imageToLatLng, latLngToImage } from './utils/coordinates';

const latlng = imageToLatLng(pin.x, pin.y, imageHeight);
const coords = latLngToImage(latlng, imageHeight);

// ❌ NEVER do manual coordinate math inline
const latlng = L.latLng(height - y, x); // FORBIDDEN - use utility
```

### 3. Event Naming

```typescript
// ✅ ALWAYS prefix custom events with 'trpg-maps:'
this.app.workspace.trigger('trpg-maps:pin-created', { pin, source: 'user' });
this.app.workspace.on('trpg-maps:map-loaded', callback);

// ❌ NEVER use unprefixed events
this.app.workspace.trigger('pin-created', pin); // FORBIDDEN
```

### 4. Error Handling

```typescript
// ✅ ALWAYS use this pattern
try {
  await operation();
} catch (error) {
  console.error('[TRPG Maps] Operation failed:', error);
  new Notice('Operation failed. Please try again.');
}

// ❌ NEVER skip error handling or use silent failures
await riskyOperation(); // FORBIDDEN without try/catch
```

### 5. Async Code

```typescript
// ✅ ALWAYS use async/await
async function loadData(): Promise<Pin[]> {
  const content = await this.app.vault.read(file);
  return this.parse(content);
}

// ❌ NEVER use raw promises with .then() or callbacks
vault.read(file).then(content => callback(content)); // FORBIDDEN
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (classes) | PascalCase.ts | `MapView.ts` |
| Files (utils) | camelCase.ts | `debounce.ts` |
| Directories | kebab-case | `modals/` |
| Classes | PascalCase | `class PinManager` |
| Functions | camelCase | `function createPin()` |
| Constants | SCREAMING_SNAKE | `const DEFAULT_ZOOM = 1` |
| Interfaces | PascalCase (NO I prefix) | `interface Pin` |
| Pin IDs | `pin-XXX` | `pin-001`, `pin-042` |

---

## Import Order

```typescript
// 1. External modules (Obsidian, Leaflet)
import { Plugin, Modal, Notice, TFile } from 'obsidian';
import L from 'leaflet';

// 2. Internal modules
import { PinManager } from './PinManager';
import { Pin, PinShape } from './types';

// 3. Utilities
import { debounce } from './utils/debounce';
import { imageToLatLng } from './utils/coordinates';
```

---

## Data Schema

### Pin Interface

```typescript
interface Pin {
  id: string;        // "pin-001" format
  name: string;      // Required, display name
  x: number;         // Image pixels (0 = left)
  y: number;         // Image pixels (0 = top)
  shape: PinShape;   // 'circle' | 'diamond' | 'shield' | 'square' | 'flag' | 'marker' | 'rectangle' | 'hexagon'
  color: string;     // Hex with # prefix: "#F59E0B"
  icon?: string;     // Lucide icon name lowercase: "beer"
  link?: string;     // Wikilink: "[[Path/To/Note]]"
}
```

### YAML Frontmatter Structure

```yaml
---
map-image: "path/to/image.png"
map-width: 4096
map-height: 4096
default-zoom: 1
pins:
  - id: "pin-001"
    name: "Location"
    x: 1250
    y: 890
    shape: "circle"
    color: "#F59E0B"
    icon: "beer"
    link: "[[Lieux/Taverne]]"
---
```

---

## Obsidian API Patterns

### Modal Pattern

```typescript
export class CreatePinModal extends Modal {
  private onSubmit: (pin: Partial<Pin>) => void;

  constructor(app: App, onSubmit: (pin: Partial<Pin>) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Create Pin' });
    // Build UI...
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

### ItemView Pattern (MapView)

```typescript
export class MapView extends ItemView {
  static VIEW_TYPE = 'trpg-map-view';
  
  getViewType(): string {
    return MapView.VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'TRPG Map';
  }

  async onOpen() {
    // Initialize Leaflet map
  }

  async onClose() {
    // Cleanup Leaflet
  }
}
```

---

## Leaflet Patterns

### Map Initialization

```typescript
// Use CRS.Simple for image maps (no geographic projection)
const map = L.map(container, {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
});

// Image bounds: [0,0] is top-left, [height, width] is bottom-right
const bounds: L.LatLngBoundsExpression = [[0, 0], [imageHeight, imageWidth]];
L.imageOverlay(imageUrl, bounds).addTo(map);
map.fitBounds(bounds);
```

### Custom Pin Markers

```typescript
// Use DivIcon with inline SVG for custom shapes
const icon = L.divIcon({
  className: 'trpg-pin-marker',
  html: getSvgForShape(pin.shape, pin.color, pin.icon),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const marker = L.marker(latlng, { icon, draggable: true });
```

---

## Debouncing

| Operation | Delay |
|-----------|-------|
| Save to file | 500ms |
| Search/filter | 200ms |
| UI updates | 16ms (requestAnimationFrame) |

---

## Anti-Patterns (NEVER Do)

```typescript
// ❌ Using Node.js modules
import * as fs from 'fs';
import * as path from 'path';

// ❌ Interface with I prefix
interface IPin { }

// ❌ Mixing callbacks and promises
vault.read(file).then(c => callback(c));

// ❌ Manual coordinate math (use utilities)
const lat = imageHeight - y;

// ❌ Unprefixed events
this.app.workspace.trigger('pin-created');

// ❌ Silent error handling
try { await op(); } catch { }

// ❌ Default export (except main.ts)
export default class PinManager { }
```

---

## File Structure Reference

```
src/
├── main.ts              # Plugin entry, lifecycle
├── MapView.ts           # Leaflet ItemView
├── PinManager.ts        # Pin CRUD + YAML sync
├── SettingsTab.ts       # Plugin settings
├── types.ts             # All interfaces
├── constants.ts         # Colors, shapes, defaults
├── modals/
│   ├── CreatePinModal.ts
│   ├── EditPinModal.ts
│   └── IconPickerModal.ts
├── components/
│   ├── PinMarker.ts
│   ├── shapes.ts        # SVG generators
│   ├── GridOverlay.ts   # Square + hex grids
│   └── MapControls.ts   # Custom control bar
├── data/
│   ├── fontawesome-icons.ts
│   └── fontawesome-svg.ts
└── utils/
    ├── coordinates.ts   # Image ↔ Leaflet
    ├── debounce.ts
    ├── validation.ts    # Zod schemas
    ├── frontmatter.ts
    └── color.ts
```

---

## Quick Reference

- **Plugin ID:** `obsidian-trpg-maps`
- **View Type:** `trpg-map-view`
- **File Extension:** `.map.md`
- **Event Prefix:** `trpg-maps:`
- **Log Prefix:** `[TRPG Maps]`
- **CSS Class Prefix:** `trpg-`

---

## V1 Implementation Status

### All Features Complete ✅

| Category | Feature | Status |
|----------|---------|--------|
| **Map Display** | Leaflet.js with CRS.Simple | ✅ |
| **Map Display** | Custom controls (bottom-right bar) | ✅ |
| **Map Display** | Free pan (no bounce-back) | ✅ |
| **Map Display** | Map/Article toggle | ✅ |
| **Map Display** | Grid overlay (square + hex) | ✅ |
| **Pins** | Create pin (right-click) | ✅ |
| **Pins** | Edit pin (full modal) | ✅ |
| **Pins** | Delete pin | ✅ |
| **Pins** | Drag & drop repositioning | ✅ |
| **Pins** | Pin locking toggle | ✅ |
| **Pins** | Pin clustering | ✅ |
| **Pins** | 8 shape options | ✅ |
| **Pins** | 21+ color palette | ✅ |
| **Pins** | Font Awesome icons | ✅ |
| **Pins** | Emoji icons | ✅ |
| **Pins** | Note linking | ✅ |
| **Pins** | Note creation from pin | ✅ |
| **Pins** | Hover preview | ✅ |
| **Pins** | Click navigation | ✅ |
| **Pins** | Name tooltips | ✅ |
| **Data** | YAML frontmatter storage | ✅ |
| **Data** | Debounced auto-save | ✅ |
| **Data** | Zod validation | ✅ |
| **UI** | Create pin modal | ✅ |
| **UI** | Edit pin modal | ✅ |
| **UI** | Icon picker modal | ✅ |
| **UI** | Color picker | ✅ |
| **UI** | Settings tab | ✅ |
| **UI** | Zoom +/- with percentage | ✅ |
| **UI** | Recenter button | ✅ |
| **UI** | Clustering toggle | ✅ |

### Deferred to V2

- Icon display modes (Show / Hide / Icon Only)
- Backlinks panel (pins linking to current note)
- Search/filter pins
- Map layers (multiple overlays)
- Tile system for very large maps
- Pin categories/tags
- Import/Export
- Measurement tool
