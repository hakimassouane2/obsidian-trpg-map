/**
 * Frontmatter parsing and manipulation utilities for TRPG Maps
 */

import { App, TFile, parseYaml, stringifyYaml } from 'obsidian';
import type { MapData, Pin } from '../types';
import { LOG_PREFIX } from '../constants';

/**
 * Parse the frontmatter from a .map.md file
 *
 * @param content - The full file content
 * @returns Parsed MapData or null if invalid
 */
export function parseFrontmatter(content: string): MapData | null {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }

  try {
    const yaml = parseYaml(match[1]);
    return yaml as MapData;
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to parse frontmatter:', error);
    return null;
  }
}

/**
 * Get the content after frontmatter
 *
 * @param content - The full file content
 * @returns Content after the frontmatter block
 */
export function getContentAfterFrontmatter(content: string): string {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : content;
}

/**
 * Serialize MapData to frontmatter YAML
 *
 * @param data - The map data to serialize
 * @returns YAML string with frontmatter delimiters
 */
export function serializeFrontmatter(data: MapData): string {
  const yaml = stringifyYaml(data);
  return `---\n${yaml}---\n`;
}

/**
 * Update the frontmatter in a file while preserving content
 *
 * @param app - Obsidian App instance
 * @param file - The file to update
 * @param mapData - New map data for frontmatter
 */
export async function updateFrontmatter(
  app: App,
  file: TFile,
  mapData: MapData
): Promise<void> {
  const content = await app.vault.read(file);
  const bodyContent = getContentAfterFrontmatter(content);
  const newFrontmatter = serializeFrontmatter(mapData);
  const newContent = newFrontmatter + bodyContent;

  await app.vault.modify(file, newContent);
}

/**
 * Add a pin to the frontmatter
 *
 * @param app - Obsidian App instance
 * @param file - The file to update
 * @param pin - The pin to add
 */
export async function addPinToFrontmatter(
  app: App,
  file: TFile,
  pin: Pin
): Promise<void> {
  const content = await app.vault.read(file);
  const mapData = parseFrontmatter(content);

  if (!mapData) {
    throw new Error('Invalid map file: missing frontmatter');
  }

  const pins = mapData.pins ?? [];
  pins.push(pin);
  mapData.pins = pins;

  await updateFrontmatter(app, file, mapData);
}

/**
 * Update a pin in the frontmatter
 *
 * @param app - Obsidian App instance
 * @param file - The file to update
 * @param pin - The updated pin (matched by id)
 */
export async function updatePinInFrontmatter(
  app: App,
  file: TFile,
  pin: Pin
): Promise<void> {
  const content = await app.vault.read(file);
  const mapData = parseFrontmatter(content);

  if (!mapData) {
    throw new Error('Invalid map file: missing frontmatter');
  }

  const pins = mapData.pins ?? [];
  const index = pins.findIndex((p) => p.id === pin.id);

  if (index === -1) {
    throw new Error(`Pin not found: ${pin.id}`);
  }

  pins[index] = pin;
  mapData.pins = pins;

  await updateFrontmatter(app, file, mapData);
}

/**
 * Remove a pin from the frontmatter
 *
 * @param app - Obsidian App instance
 * @param file - The file to update
 * @param pinId - The ID of the pin to remove
 */
export async function removePinFromFrontmatter(
  app: App,
  file: TFile,
  pinId: string
): Promise<void> {
  const content = await app.vault.read(file);
  const mapData = parseFrontmatter(content);

  if (!mapData) {
    throw new Error('Invalid map file: missing frontmatter');
  }

  const pins = mapData.pins ?? [];
  mapData.pins = pins.filter((p) => p.id !== pinId);

  await updateFrontmatter(app, file, mapData);
}

/**
 * Generate a new unique pin ID
 *
 * @param existingPins - Array of existing pins
 * @returns New pin ID in format "pin-XXX"
 */
export function generatePinId(existingPins: Pin[]): string {
  let maxNum = 0;

  for (const pin of existingPins) {
    const match = pin.id.match(/^pin-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const newNum = maxNum + 1;
  return `pin-${newNum.toString().padStart(3, '0')}`;
}

/**
 * Create a new empty map file
 *
 * @param app - Obsidian App instance
 * @param path - Path for the new file
 * @param imagePath - Path to the map image
 * @returns The created file
 */
export async function createMapFile(
  app: App,
  path: string,
  imagePath: string
): Promise<TFile> {
  const mapData: MapData = {
    'map-image': imagePath,
    pins: [],
  };

  const content = serializeFrontmatter(mapData) + '\n# Map\n\nNotes about this map...\n';

  const file = await app.vault.create(path, content);
  return file;
}
