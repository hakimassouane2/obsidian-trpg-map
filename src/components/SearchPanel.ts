/**
 * SearchPanel component for searching and filtering pins
 */

import { CSS_PREFIX } from '../constants';
import type { Pin } from '../types';

export interface SearchPanelOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** All pins on the map */
  pins: Pin[];
  /** Callback when a pin is selected from results */
  onPinSelect: (pin: Pin) => void;
  /** Callback when search query changes (for live filtering) */
  onSearchChange?: (query: string, matchingPins: Pin[]) => void;
}

export class SearchPanel {
  private container: HTMLElement;
  private pins: Pin[] = [];
  private onPinSelect: (pin: Pin) => void;
  private onSearchChange?: (query: string, matchingPins: Pin[]) => void;
  
  private panelEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private resultsEl!: HTMLElement;
  private clearBtn!: HTMLElement;
  private isOpen = false;
  private currentQuery = '';

  constructor(options: SearchPanelOptions) {
    this.container = options.container;
    this.pins = options.pins;
    this.onPinSelect = options.onPinSelect;
    this.onSearchChange = options.onSearchChange;
    
    this.render();
  }

  /**
   * Render the search panel
   */
  private render(): void {
    this.panelEl = this.container.createDiv({ cls: `${CSS_PREFIX}search-panel` });
    this.panelEl.style.display = 'none';
    
    // Header with search input
    const header = this.panelEl.createDiv({ cls: `${CSS_PREFIX}search-header` });
    
    const inputWrapper = header.createDiv({ cls: `${CSS_PREFIX}search-input-wrapper` });
    
    // Search icon
    inputWrapper.createDiv({ cls: `${CSS_PREFIX}search-icon` }).innerHTML = this.getSearchIcon();
    
    this.inputEl = inputWrapper.createEl('input', {
      type: 'text',
      placeholder: 'Search pins by name or tag...',
      cls: `${CSS_PREFIX}search-input`,
    });
    
    // Clear button
    this.clearBtn = inputWrapper.createDiv({ 
      cls: `${CSS_PREFIX}search-clear`,
      attr: { 'aria-label': 'Clear search' }
    });
    this.clearBtn.innerHTML = '×';
    this.clearBtn.style.display = 'none';
    this.clearBtn.addEventListener('click', () => this.clearSearch());
    
    // Close button
    const closeBtn = header.createDiv({ 
      cls: `${CSS_PREFIX}search-close`,
      attr: { 'aria-label': 'Close search' }
    });
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => this.close());
    
    // Results container
    this.resultsEl = this.panelEl.createDiv({ cls: `${CSS_PREFIX}search-results` });
    
    // Event listeners
    this.inputEl.addEventListener('input', () => this.handleSearch());
    this.inputEl.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  /**
   * Handle search input
   */
  private handleSearch(): void {
    const query = this.inputEl.value.trim().toLowerCase();
    this.currentQuery = query;
    
    // Show/hide clear button
    this.clearBtn.style.display = query ? 'flex' : 'none';
    
    if (!query) {
      this.resultsEl.empty();
      this.resultsEl.createDiv({ 
        cls: `${CSS_PREFIX}search-hint`,
        text: 'Type to search pins...'
      });
      this.onSearchChange?.('', []);
      return;
    }
    
    // Search pins
    const results = this.searchPins(query);
    this.renderResults(results);
    this.onSearchChange?.(query, results);
  }

  /**
   * Search pins by name and tags
   */
  private searchPins(query: string): Pin[] {
    return this.pins.filter(pin => {
      // Search in name
      if (pin.name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in tags
      if (pin.tags && pin.tags.some(tag => tag.toLowerCase().includes(query))) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Render search results
   */
  private renderResults(results: Pin[]): void {
    this.resultsEl.empty();
    
    if (results.length === 0) {
      this.resultsEl.createDiv({ 
        cls: `${CSS_PREFIX}search-no-results`,
        text: 'No pins found'
      });
      return;
    }
    
    // Show result count
    const countEl = this.resultsEl.createDiv({ cls: `${CSS_PREFIX}search-count` });
    countEl.setText(`${results.length} pin${results.length !== 1 ? 's' : ''} found`);
    
    // Results list
    const listEl = this.resultsEl.createDiv({ cls: `${CSS_PREFIX}search-list` });
    
    for (const pin of results.slice(0, 50)) { // Limit to 50 results
      const item = listEl.createDiv({ cls: `${CSS_PREFIX}search-item` });
      
      // Pin color indicator
      const colorDot = item.createDiv({ cls: `${CSS_PREFIX}search-item-color` });
      colorDot.style.backgroundColor = pin.color;
      
      // Pin info
      const info = item.createDiv({ cls: `${CSS_PREFIX}search-item-info` });
      
      // Name with highlight
      const nameEl = info.createDiv({ cls: `${CSS_PREFIX}search-item-name` });
      nameEl.innerHTML = this.highlightMatch(pin.name, this.currentQuery);
      
      // Tags (if any)
      if (pin.tags && pin.tags.length > 0) {
        const tagsEl = info.createDiv({ cls: `${CSS_PREFIX}search-item-tags` });
        for (const tag of pin.tags.slice(0, 3)) { // Show max 3 tags
          const tagEl = tagsEl.createSpan({ cls: `${CSS_PREFIX}search-item-tag` });
          tagEl.innerHTML = this.highlightMatch(tag, this.currentQuery);
        }
        if (pin.tags.length > 3) {
          tagsEl.createSpan({ 
            cls: `${CSS_PREFIX}search-item-tag-more`,
            text: `+${pin.tags.length - 3}`
          });
        }
      }
      
      // Click handler
      item.addEventListener('click', () => {
        this.onPinSelect(pin);
      });
    }
    
    if (results.length > 50) {
      this.resultsEl.createDiv({ 
        cls: `${CSS_PREFIX}search-more`,
        text: `... and ${results.length - 50} more`
      });
    }
  }

  /**
   * Highlight matching text
   */
  private highlightMatch(text: string, query: string): string {
    if (!query) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.currentQuery) {
        this.clearSearch();
      } else {
        this.close();
      }
    }
  }

  /**
   * Clear the search
   */
  private clearSearch(): void {
    this.inputEl.value = '';
    this.currentQuery = '';
    this.clearBtn.style.display = 'none';
    this.resultsEl.empty();
    this.resultsEl.createDiv({ 
      cls: `${CSS_PREFIX}search-hint`,
      text: 'Type to search pins...'
    });
    this.onSearchChange?.('', []);
    this.inputEl.focus();
  }

  /**
   * Open the panel
   */
  open(): void {
    this.isOpen = true;
    this.panelEl.style.display = 'flex';
    this.inputEl.focus();
    
    // Show hint if no query
    if (!this.currentQuery) {
      this.resultsEl.empty();
      this.resultsEl.createDiv({ 
        cls: `${CSS_PREFIX}search-hint`,
        text: 'Type to search pins...'
      });
    }
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
   * Update pins list
   */
  updatePins(pins: Pin[]): void {
    this.pins = pins;
    // Re-run search if there's a query
    if (this.currentQuery) {
      this.handleSearch();
    }
  }

  /**
   * Get search icon SVG
   */
  private getSearchIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    this.panelEl.remove();
  }
}
