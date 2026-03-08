/**
 * Core type definitions for TRPG Maps plugin
 */

/** Available pin shapes (LegendKeeper style) */
export type PinShape =
  | 'pin'
  | 'circle'
  | 'diamond'
  | 'arch'
  | 'shield'
  | 'flag'
  | 'banner'
  | 'marker';

/** Icon display mode for pins */
export type IconDisplayMode = 'show' | 'hide' | 'icon-only';

/** Pin data structure stored in YAML frontmatter */
export interface Pin {
  /** Unique identifier (format: "pin-XXX") */
  id: string;
  /** Display name of the pin */
  name: string;
  /** X coordinate in image pixels (0 = left edge) */
  x: number;
  /** Y coordinate in image pixels (0 = top edge) */
  y: number;
  /** Shape of the pin marker */
  shape: PinShape;
  /** Color as hex string with # prefix (e.g., "#F59E0B") */
  color: string;
  /** Optional Lucide icon name (lowercase) or emoji */
  icon?: string;
  /** Icon display mode: show (shape+icon), hide (shape only), icon-only */
  iconDisplay?: IconDisplayMode;
  /** Optional Obsidian wikilink (e.g., "[[Path/To/Note]]") */
  link?: string;
  /** Optional tags for categorization and filtering */
  tags?: string[];
}

/** Map metadata stored in YAML frontmatter */
export interface MapData {
  /** Path to the map image file (relative to vault) */
  'map-image': string;
  /** Width of the map image in pixels */
  'map-width'?: number;
  /** Height of the map image in pixels */
  'map-height'?: number;
  /** Default zoom level */
  'default-zoom'?: number;
  /** Array of pins on this map */
  pins?: Pin[];
}

/** Grid type options */
export type GridType = 'square' | 'hex-horizontal' | 'hex-vertical';

/** Plugin settings stored in Obsidian data.json */
export interface TRPGMapsSettings {
  /** Default folder for new notes created from pins */
  defaultNoteFolder: string;
  /** Template file path for new notes */
  noteTemplate: string;
  /** Enable/disable pin clustering */
  enableClustering: boolean;
  /** Distance threshold for clustering (pixels) */
  clusterThreshold: number;
  /** Default zoom level for new maps */
  defaultZoom: number;
  /** Show grid overlay on maps */
  showGrid: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Grid type: square, hex-horizontal, or hex-vertical */
  gridType: GridType;
}

/** Event payload for pin-related events */
export interface PinEvent {
  pin: Pin;
  source: 'user' | 'sync' | 'load';
}

/** Event payload for map-related events */
export interface MapEvent {
  filePath: string;
  mapData: MapData;
}

/** Coordinates in image pixel space */
export interface ImageCoords {
  x: number;
  y: number;
}

/** Result of parsing a .map.md file */
export interface ParsedMapFile {
  frontmatter: MapData;
  content: string;
}
