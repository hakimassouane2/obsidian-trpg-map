/**
 * LabelManager - Handles label CRUD operations and YAML persistence
 */

import { App, TFile } from 'obsidian';
import type { Label, MapData } from './types';
import {
  LOG_PREFIX,
  EVENTS,
  DEFAULT_LABEL_COLOR,
  DEFAULT_LABEL_FONT_FAMILY,
  DEFAULT_LABEL_FONT_SIZE,
} from './constants';
import {
  parseFrontmatter,
  generateLabelId,
  addLabelToFrontmatter,
  updateLabelInFrontmatter,
  removeLabelFromFrontmatter,
} from './utils/frontmatter';

export class LabelManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Create a new label and save to file
   */
  async createLabel(file: TFile, labelData: Partial<Label>): Promise<Label> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);

      if (!mapData) {
        throw new Error('Invalid map file: missing frontmatter');
      }

      const existingLabels = mapData.labels ?? [];

      const label: Label = {
        id: generateLabelId(existingLabels),
        text: labelData.text ?? 'Label',
        x: labelData.x ?? 0,
        y: labelData.y ?? 0,
        fontFamily: labelData.fontFamily ?? DEFAULT_LABEL_FONT_FAMILY,
        fontSize: labelData.fontSize ?? DEFAULT_LABEL_FONT_SIZE,
        bold: labelData.bold ?? false,
        italic: labelData.italic ?? false,
        color: labelData.color ?? DEFAULT_LABEL_COLOR,
        strokeWidth: labelData.strokeWidth ?? 0,
        rotation: labelData.rotation ?? 0,
        curve: labelData.curve ?? 0,
      };

      await addLabelToFrontmatter(this.app, file, label);

      this.app.workspace.trigger(EVENTS.LABEL_CREATED, { label, source: 'user' });

      return label;
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to create label:', error);
      throw error;
    }
  }

  /**
   * Update an existing label
   */
  async updateLabel(file: TFile, label: Label): Promise<void> {
    try {
      await updateLabelInFrontmatter(this.app, file, label);
      this.app.workspace.trigger(EVENTS.LABEL_UPDATED, { label, source: 'user' });
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to update label:', error);
      throw error;
    }
  }

  /**
   * Delete a label
   */
  async deleteLabel(file: TFile, labelId: string): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);
      const label = mapData?.labels?.find((l) => l.id === labelId);

      await removeLabelFromFrontmatter(this.app, file, labelId);

      if (label) {
        this.app.workspace.trigger(EVENTS.LABEL_DELETED, { label, source: 'user' });
      }
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to delete label:', error);
      throw error;
    }
  }

  /**
   * Get all labels from a map file
   */
  async getLabels(file: TFile): Promise<Label[]> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);
      return mapData?.labels ?? [];
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to get labels:', error);
      throw error;
    }
  }

  /**
   * Get a single label by id
   */
  async getLabel(file: TFile, labelId: string): Promise<Label | undefined> {
    const labels = await this.getLabels(file);
    return labels.find((l) => l.id === labelId);
  }

  /**
   * Move a label to new coordinates
   */
  async moveLabel(file: TFile, labelId: string, x: number, y: number): Promise<void> {
    const label = await this.getLabel(file, labelId);
    if (!label) {
      throw new Error(`Label not found: ${labelId}`);
    }

    await this.updateLabel(file, { ...label, x, y });
  }
}
