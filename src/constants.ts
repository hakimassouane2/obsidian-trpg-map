/**
 * Constants and default values for TRPG Maps plugin
 */

import type { PinShape, TRPGMapsSettings } from './types';

/** Plugin identifiers */
export const PLUGIN_ID = 'obsidian-trpg-maps';
export const VIEW_TYPE_MAP = 'trpg-map-view';
export const MAP_FILE_EXTENSION = 'map.md';

/** Event names (all prefixed with trpg-maps:) */
export const EVENTS = {
  PIN_CREATED: 'trpg-maps:pin-created',
  PIN_UPDATED: 'trpg-maps:pin-updated',
  PIN_DELETED: 'trpg-maps:pin-deleted',
  MAP_LOADED: 'trpg-maps:map-loaded',
  MAP_SAVED: 'trpg-maps:map-saved',
} as const;

/** Log prefix for console messages */
export const LOG_PREFIX = '[TRPG Maps]';

/** CSS class prefix */
export const CSS_PREFIX = 'trpg-';

/** Default plugin settings */
export const DEFAULT_SETTINGS: TRPGMapsSettings = {
  defaultNoteFolder: '',
  noteTemplate: '',
  enableClustering: true,
  clusterThreshold: 80,
  defaultZoom: 1,
  showGrid: false,
  gridSize: 50,
  gridType: 'square',
};

/** Available pin shapes (LegendKeeper style) */
export const PIN_SHAPES: PinShape[] = [
  'pin',
  'circle',
  'diamond',
  'arch',
  'shield',
  'flag',
  'banner',
  'marker',
];

/** Default color palette for pins */
export const DEFAULT_COLORS: string[] = [
  // Row 1 - Light pastels
  '#FFFFFF', '#D4D4D4', '#5EEAD4', '#93C5FD',
  '#D8B4FE', '#F9A8D4', '#FCA5A5', '#FCD34D',
  // Row 2 - Mid tones
  '#262626', '#737373', '#14B8A6', '#3B82F6',
  '#A855F7', '#EC4899', '#EF4444', '#F59E0B',
  // Row 3 - Dark tones
  '#000000', '#101012', '#134E4A', '#1E3A8A',
  '#581C87', '#831843', '#7F1D1D', '#78350F',
];

/** Default pin color */
export const DEFAULT_PIN_COLOR = '#3B82F6';

/** Default pin shape */
export const DEFAULT_PIN_SHAPE: PinShape = 'pin';

/** Leaflet map configuration */
export const LEAFLET_CONFIG = {
  MIN_ZOOM: -2,
  MAX_ZOOM: 4,
  ZOOM_SNAP: 0.25,
  ZOOM_DELTA: 0.5,
  WHEEL_PX_PER_ZOOM: 120,
} as const;

/** Pin marker configuration */
export const PIN_MARKER_CONFIG = {
  // Large size (with icon)
  SIZE: 48,
  ANCHOR_X: 24,
  ANCHOR_Y: 48,
  // Small size (without icon / hide mode)
  SIZE_SMALL: 30,
  ANCHOR_X_SMALL: 15,
  ANCHOR_Y_SMALL: 30,
} as const;

/** Debounce delays in milliseconds */
export const DEBOUNCE = {
  SAVE: 500,
  SEARCH: 200,
  UI_UPDATE: 16,
} as const;

/** Common Lucide icons for RPG maps */
export const SUGGESTED_ICONS: string[] = [
  // Locations
  'castle',
  'home',
  'building',
  'church',
  'landmark',
  'tent',
  'warehouse',
  // Nature
  'tree-deciduous',
  'trees',
  'mountain',
  'mountain-snow',
  'waves',
  'anchor',
  // Commerce
  'store',
  'beer',
  'utensils',
  'bed',
  'coins',
  'gem',
  // Combat/Adventure
  'sword',
  'swords',
  'shield',
  'skull',
  'flame',
  'zap',
  // People/Creatures
  'user',
  'users',
  'crown',
  'ghost',
  'bug',
  // Misc
  'star',
  'heart',
  'flag',
  'map-pin',
  'compass',
  'scroll',
  'book',
  'key',
  'lock',
  'eye',
  'alert-triangle',
  'help-circle',
  'info',
];
