/**
 * Zod validation schemas for TRPG Maps
 */

import { z } from 'zod';
import { PIN_SHAPES } from '../constants';

/** Schema for pin shape validation */
export const PinShapeSchema = z.enum([
  'circle',
  'diamond',
  'shield',
  'square',
  'flag',
  'marker',
  'rectangle',
  'hexagon',
]);

/** Schema for hex color validation */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)');

/** Schema for Obsidian wikilink validation */
export const WikilinkSchema = z
  .string()
  .regex(/^\[\[.+\]\]$/, 'Link must be a valid wikilink (e.g., [[Note Name]])')
  .optional();

/** Schema for pin ID validation */
export const PinIdSchema = z
  .string()
  .regex(/^pin-\d{3,}$/, 'Pin ID must be in format pin-XXX');

/** Schema for a single pin */
export const PinSchema = z.object({
  id: PinIdSchema,
  name: z.string().min(1, 'Pin name is required'),
  x: z.number().int().min(0, 'X coordinate must be non-negative'),
  y: z.number().int().min(0, 'Y coordinate must be non-negative'),
  shape: PinShapeSchema,
  color: HexColorSchema,
  icon: z.string().optional(),
  link: z.string().optional(),
});

/** Schema for map frontmatter data */
export const MapDataSchema = z.object({
  'map-image': z.string().min(1, 'Map image path is required'),
  'map-width': z.number().int().positive().optional(),
  'map-height': z.number().int().positive().optional(),
  'default-zoom': z.number().optional(),
  pins: z.array(PinSchema).optional().default([]),
});

/** Schema for plugin settings */
export const SettingsSchema = z.object({
  defaultNoteFolder: z.string().default(''),
  noteTemplate: z.string().default(''),
  enableClustering: z.boolean().default(true),
  clusterThreshold: z.number().int().min(10).max(500).default(80),
  defaultZoom: z.number().min(-2).max(4).default(1),
  showGrid: z.boolean().default(false),
  gridSize: z.number().int().min(10).max(500).default(50),
});

/** Type inference helpers */
export type ValidatedPin = z.infer<typeof PinSchema>;
export type ValidatedMapData = z.infer<typeof MapDataSchema>;
export type ValidatedSettings = z.infer<typeof SettingsSchema>;

/**
 * Validate pin data and return result
 */
export function validatePin(data: unknown): { success: true; data: ValidatedPin } | { success: false; error: string } {
  const result = PinSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message ?? 'Invalid pin data' };
}

/**
 * Validate map data and return result
 */
export function validateMapData(data: unknown): { success: true; data: ValidatedMapData } | { success: false; error: string } {
  const result = MapDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message ?? 'Invalid map data' };
}

/**
 * Check if a value is a valid pin shape
 */
export function isValidPinShape(value: unknown): value is z.infer<typeof PinShapeSchema> {
  return PinShapeSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid hex color
 */
export function isValidHexColor(value: unknown): value is string {
  return HexColorSchema.safeParse(value).success;
}
