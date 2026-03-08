/**
 * PinManager - Handles pin CRUD operations and YAML persistence
 */

import { App, TFile, Notice } from 'obsidian';
import type { Pin, MapData } from './types';
import { LOG_PREFIX, EVENTS, DEFAULT_PIN_COLOR, DEFAULT_PIN_SHAPE } from './constants';
import {
  parseFrontmatter,
  generatePinId,
  addPinToFrontmatter,
  updatePinInFrontmatter,
  removePinFromFrontmatter,
} from './utils/frontmatter';
import { debounceAsync } from './utils/debounce';
import { DEBOUNCE } from './constants';

export class PinManager {
  private app: App;
  private saveDebounced: ReturnType<typeof debounceAsync>;

  constructor(app: App) {
    this.app = app;

    // Create debounced save function
    this.saveDebounced = debounceAsync(
      async (file: TFile, mapData: MapData) => {
        await this.saveMapData(file, mapData);
      },
      DEBOUNCE.SAVE
    );
  }

  /**
   * Create a new pin and save to file
   *
   * @param file - The map file to add the pin to
   * @param pinData - Partial pin data (id will be generated)
   * @returns The created pin with generated id
   */
  async createPin(file: TFile, pinData: Partial<Pin>): Promise<Pin> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);

      if (!mapData) {
        throw new Error('Invalid map file: missing frontmatter');
      }

      const existingPins = mapData.pins ?? [];

      const pin: Pin = {
        id: generatePinId(existingPins),
        name: pinData.name ?? 'New Pin',
        x: pinData.x ?? 0,
        y: pinData.y ?? 0,
        shape: pinData.shape ?? DEFAULT_PIN_SHAPE,
        color: pinData.color ?? DEFAULT_PIN_COLOR,
        icon: pinData.icon,
        iconDisplay: pinData.iconDisplay,
        link: pinData.link,
        tags: pinData.tags,
      };

      await addPinToFrontmatter(this.app, file, pin);

      // Trigger event
      this.app.workspace.trigger(EVENTS.PIN_CREATED, { pin, source: 'user' });

      return pin;
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to create pin:', error);
      throw error;
    }
  }

  /**
   * Update an existing pin
   *
   * @param file - The map file containing the pin
   * @param pin - The updated pin data (matched by id)
   */
  async updatePin(file: TFile, pin: Pin): Promise<void> {
    try {
      await updatePinInFrontmatter(this.app, file, pin);

      // Trigger event
      this.app.workspace.trigger(EVENTS.PIN_UPDATED, { pin, source: 'user' });
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to update pin:', error);
      throw error;
    }
  }

  /**
   * Delete a pin
   *
   * @param file - The map file containing the pin
   * @param pinId - The id of the pin to delete
   */
  async deletePin(file: TFile, pinId: string): Promise<void> {
    try {
      // Get pin data before deletion for the event
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);
      const pin = mapData?.pins?.find((p) => p.id === pinId);

      await removePinFromFrontmatter(this.app, file, pinId);

      // Trigger event
      if (pin) {
        this.app.workspace.trigger(EVENTS.PIN_DELETED, { pin, source: 'user' });
      }
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to delete pin:', error);
      throw error;
    }
  }

  /**
   * Get all pins from a map file
   *
   * @param file - The map file to read
   * @returns Array of pins
   */
  async getPins(file: TFile): Promise<Pin[]> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);
      return mapData?.pins ?? [];
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to get pins:', error);
      throw error;
    }
  }

  /**
   * Get a single pin by id
   *
   * @param file - The map file to search
   * @param pinId - The id of the pin to find
   * @returns The pin or undefined if not found
   */
  async getPin(file: TFile, pinId: string): Promise<Pin | undefined> {
    const pins = await this.getPins(file);
    return pins.find((p) => p.id === pinId);
  }

  /**
   * Move a pin to new coordinates
   *
   * @param file - The map file containing the pin
   * @param pinId - The id of the pin to move
   * @param x - New X coordinate
   * @param y - New Y coordinate
   */
  async movePin(file: TFile, pinId: string, x: number, y: number): Promise<void> {
    const pin = await this.getPin(file, pinId);
    if (!pin) {
      throw new Error(`Pin not found: ${pinId}`);
    }

    await this.updatePin(file, { ...pin, x, y });
  }

  /**
   * Get the map data from a file
   *
   * @param file - The map file to read
   * @returns MapData or null if invalid
   */
  async getMapData(file: TFile): Promise<MapData | null> {
    try {
      const content = await this.app.vault.read(file);
      return parseFrontmatter(content);
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to get map data:', error);
      return null;
    }
  }

  /**
   * Save map data to file (internal, use debounced version for frequent updates)
   */
  private async saveMapData(file: TFile, mapData: MapData): Promise<void> {
    const { updateFrontmatter } = await import('./utils/frontmatter');
    await updateFrontmatter(this.app, file, mapData);

    // Trigger event
    this.app.workspace.trigger(EVENTS.MAP_SAVED, { filePath: file.path, mapData });
  }

  /**
   * Bulk update pins (useful for batch operations)
   *
   * @param file - The map file to update
   * @param pins - New array of pins (replaces existing)
   */
  async setPins(file: TFile, pins: Pin[]): Promise<void> {
    try {
      const mapData = await this.getMapData(file);
      if (!mapData) {
        throw new Error('Invalid map file: missing frontmatter');
      }

      mapData.pins = pins;
      await this.saveDebounced(file, mapData);
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to set pins:', error);
      throw error;
    }
  }
}
