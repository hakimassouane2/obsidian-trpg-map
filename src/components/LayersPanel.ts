/**
 * LayersPanel component for filtering pins by tags
 */

import { CSS_PREFIX } from '../constants';
import type { Pin } from '../types';

export interface LayersPanelOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** All pins on the map */
  pins: Pin[];
  /** Callback when visibility changes */
  onVisibilityChange: (visibleTags: Set<string> | null) => void;
}

interface TagInfo {
  name: string;
  count: number;
  visible: boolean;
}

export class LayersPanel {
  private container: HTMLElement;
  private pins: Pin[] = [];
  private onVisibilityChange: (visibleTags: Set<string> | null) => void;
  
  private panelEl!: HTMLElement;
  private tagsListEl!: HTMLElement;
  private tags: Map<string, TagInfo> = new Map();
  private isOpen = false;
  
  // null means "show all" (no filtering)
  private visibleTags: Set<string> | null = null;
  
  // Special tag for pins without tags
  private static readonly UNTAGGED = '__untagged__';

  constructor(options: LayersPanelOptions) {
    this.container = options.container;
    this.pins = options.pins;
    this.onVisibilityChange = options.onVisibilityChange;
    
    this.extractTags();
    this.render();
  }

  /**
   * Extract all unique tags from pins
   */
  private extractTags(): void {
    this.tags.clear();
    
    let untaggedCount = 0;
    
    for (const pin of this.pins) {
      if (pin.tags && pin.tags.length > 0) {
        for (const tag of pin.tags) {
          const existing = this.tags.get(tag);
          if (existing) {
            existing.count++;
          } else {
            this.tags.set(tag, { name: tag, count: 1, visible: true });
          }
        }
      } else {
        untaggedCount++;
      }
    }
    
    // Add "untagged" category if there are pins without tags
    if (untaggedCount > 0) {
      this.tags.set(LayersPanel.UNTAGGED, { 
        name: LayersPanel.UNTAGGED, 
        count: untaggedCount, 
        visible: true 
      });
    }
  }

  /**
   * Render the panel
   */
  private render(): void {
    this.panelEl = this.container.createDiv({ cls: `${CSS_PREFIX}layers-panel` });
    this.panelEl.style.display = 'none';
    
    // Header
    const header = this.panelEl.createDiv({ cls: `${CSS_PREFIX}layers-header` });
    header.createSpan({ text: 'Layers', cls: `${CSS_PREFIX}layers-title` });
    
    const closeBtn = header.createSpan({ 
      text: '×', 
      cls: `${CSS_PREFIX}layers-close`,
      attr: { 'aria-label': 'Close layers panel' }
    });
    closeBtn.addEventListener('click', () => this.close());
    
    // Tags list
    this.tagsListEl = this.panelEl.createDiv({ cls: `${CSS_PREFIX}layers-list` });
    this.renderTagsList();
    
    // Footer with actions
    const footer = this.panelEl.createDiv({ cls: `${CSS_PREFIX}layers-footer` });
    
    const showAllBtn = footer.createEl('button', { 
      text: 'Show All',
      cls: `${CSS_PREFIX}layers-btn`
    });
    showAllBtn.addEventListener('click', () => this.showAll());
    
    const hideAllBtn = footer.createEl('button', { 
      text: 'Hide All',
      cls: `${CSS_PREFIX}layers-btn`
    });
    hideAllBtn.addEventListener('click', () => this.hideAll());
  }

  /**
   * Render the tags list
   */
  private renderTagsList(): void {
    this.tagsListEl.empty();
    
    if (this.tags.size === 0) {
      this.tagsListEl.createDiv({ 
        text: 'No tags found. Add tags to pins to use layers.',
        cls: `${CSS_PREFIX}layers-empty`
      });
      return;
    }
    
    // Sort tags alphabetically, but keep "untagged" at the end
    const sortedTags = Array.from(this.tags.values()).sort((a, b) => {
      if (a.name === LayersPanel.UNTAGGED) return 1;
      if (b.name === LayersPanel.UNTAGGED) return -1;
      return a.name.localeCompare(b.name);
    });
    
    for (const tagInfo of sortedTags) {
      const item = this.tagsListEl.createDiv({ cls: `${CSS_PREFIX}layers-item` });
      
      const checkbox = item.createEl('input', {
        type: 'checkbox',
        cls: `${CSS_PREFIX}layers-checkbox`,
      });
      checkbox.checked = this.isTagVisible(tagInfo.name);
      checkbox.addEventListener('change', () => {
        this.toggleTag(tagInfo.name, checkbox.checked);
      });
      
      const label = item.createSpan({ cls: `${CSS_PREFIX}layers-label` });
      
      const displayName = tagInfo.name === LayersPanel.UNTAGGED ? 'Untagged' : tagInfo.name;
      label.createSpan({ text: displayName, cls: `${CSS_PREFIX}layers-tag-name` });
      label.createSpan({ text: `(${tagInfo.count})`, cls: `${CSS_PREFIX}layers-tag-count` });
      
      label.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        this.toggleTag(tagInfo.name, checkbox.checked);
      });
    }
  }

  /**
   * Check if a tag is visible
   */
  private isTagVisible(tag: string): boolean {
    // If visibleTags is null, all are visible
    if (this.visibleTags === null) return true;
    return this.visibleTags.has(tag);
  }

  /**
   * Toggle a tag's visibility
   */
  private toggleTag(tag: string, visible: boolean): void {
    // If currently showing all, initialize the set with all tags
    if (this.visibleTags === null) {
      this.visibleTags = new Set(this.tags.keys());
    }
    
    if (visible) {
      this.visibleTags.add(tag);
    } else {
      this.visibleTags.delete(tag);
    }
    
    // If all tags are visible, set to null (show all mode)
    if (this.visibleTags.size === this.tags.size) {
      this.visibleTags = null;
    }
    
    this.onVisibilityChange(this.visibleTags);
  }

  /**
   * Show all tags
   */
  private showAll(): void {
    this.visibleTags = null;
    this.renderTagsList();
    this.onVisibilityChange(null);
  }

  /**
   * Hide all tags
   */
  private hideAll(): void {
    this.visibleTags = new Set();
    this.renderTagsList();
    this.onVisibilityChange(this.visibleTags);
  }

  /**
   * Open the panel
   */
  open(): void {
    this.isOpen = true;
    this.panelEl.style.display = 'flex';
  }

  /**
   * Close the panel
   */
  close(): void {
    this.isOpen = false;
    this.panelEl.style.display = 'none';
  }

  /**
   * Toggle the panel
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if panel is open
   */
  isVisible(): boolean {
    return this.isOpen;
  }

  /**
   * Update pins and refresh tags
   */
  updatePins(pins: Pin[]): void {
    this.pins = pins;
    this.extractTags();
    this.renderTagsList();
  }

  /**
   * Get current visible tags (null means all visible)
   */
  getVisibleTags(): Set<string> | null {
    return this.visibleTags;
  }

  /**
   * Check if a pin should be visible based on current filter
   */
  isPinVisible(pin: Pin): boolean {
    // If no filter active, all pins are visible
    if (this.visibleTags === null) return true;
    
    // If pin has no tags, check the "untagged" visibility
    if (!pin.tags || pin.tags.length === 0) {
      return this.visibleTags.has(LayersPanel.UNTAGGED);
    }
    
    // Pin is visible if ANY of its tags are visible
    return pin.tags.some(tag => this.visibleTags!.has(tag));
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    this.panelEl.remove();
  }
}
