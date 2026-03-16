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

/** Font family options for labels */
export type LabelFontFamily = 'sans' | 'serif' | 'mono';

/** Font size options for labels */
export type LabelFontSize = 'small' | 'medium' | 'large';

/** Label data structure stored in YAML frontmatter */
export interface Label {
  /** Unique identifier (format: "label-XXX") */
  id: string;
  /** Display text of the label */
  text: string;
  /** X coordinate in image pixels (0 = left edge) */
  x: number;
  /** Y coordinate in image pixels (0 = top edge) */
  y: number;
  /** Font family: sans, serif, or mono */
  fontFamily: LabelFontFamily;
  /** Font size: small, medium, or large */
  fontSize: LabelFontSize;
  /** Whether text is bold */
  bold: boolean;
  /** Whether text is italic */
  italic: boolean;
  /** Text color as hex string with # prefix */
  color: string;
  /** Stroke width (0 = no stroke, 1-10) */
  strokeWidth: number;
  /** Rotation angle in degrees (0-360) */
  rotation: number;
  /** Curve/bend amount (-100 to 100, 0 = straight) */
  curve: number;
}

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
  /** Path to the map image file (relative to vault, or wikilink like [[name]]) - preferred short form */
  'map'?: string | string[];
  /** Path to the map image file (legacy, still supported for backward compatibility) */
  'map-image'?: string | string[];
  /** Width of the map image in pixels */
  'map-width'?: number;
  /** Height of the map image in pixels */
  'map-height'?: number;
  /** Default zoom level */
  'default-zoom'?: number;
  /** Array of pins on this map */
  pins?: Pin[];
  /** Array of text labels on this map */
  labels?: Label[];
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

/** Event payload for label-related events */
export interface LabelEvent {
  label: Label;
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
