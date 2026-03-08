/**
 * BacklinksPanel component for showing notes that link to a pin's linked note
 * Similar to Obsidian's native backlinks, but scoped to the selected pin
 */

import type { App, TFile } from 'obsidian';
import { CSS_PREFIX, LOG_PREFIX } from '../constants';
import type { Pin } from '../types';

export interface BacklinksPanelOptions {
  /** Obsidian App reference */
  app: App;
  /** Container element to render into */
  container: HTMLElement;
  /** Current map file */
  currentFile: TFile | null;
  /** Callback when a backlink is clicked */
  onBacklinkClick: (filePath: string) => void;
}

interface BacklinkInfo {
  file: TFile;
  /** Number of times the link appears in this file */
  count: number;
}

export class BacklinksPanel {
  private app: App;
  private container: HTMLElement;
  private currentFile: TFile | null;
  private onBacklinkClick: (filePath: string) => void;
  
  private panelEl!: HTMLElement;
  private headerEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private contentEl!: HTMLElement;
  private isOpen = false;
  private currentPin: Pin | null = null;
  private backlinks: BacklinkInfo[] = [];

  constructor(options: BacklinksPanelOptions) {
    this.app = options.app;
    this.container = options.container;
    this.currentFile = options.currentFile;
    this.onBacklinkClick = options.onBacklinkClick;
    
    this.render();
  }

  /**
   * Render the panel structure
   */
  private render(): void {
    this.panelEl = this.container.createDiv({ cls: `${CSS_PREFIX}backlinks-panel` });
    this.panelEl.style.display = 'none';
    
    // Header
    this.headerEl = this.panelEl.createDiv({ cls: `${CSS_PREFIX}backlinks-header` });
    this.titleEl = this.headerEl.createSpan({ text: 'Backlinks', cls: `${CSS_PREFIX}backlinks-title` });
    
    const closeBtn = this.headerEl.createSpan({ 
      text: '×', 
      cls: `${CSS_PREFIX}backlinks-close`,
      attr: { 'aria-label': 'Close backlinks panel' }
    });
    closeBtn.addEventListener('click', () => this.close());
    
    // Content area
    this.contentEl = this.panelEl.createDiv({ cls: `${CSS_PREFIX}backlinks-content` });
    this.renderEmptyState();
  }

  /**
   * Render the empty state (no pin selected)
   */
  private renderEmptyState(): void {
    this.contentEl.empty();
    this.titleEl.setText('Backlinks');
    
    const emptyDiv = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-empty` });
    emptyDiv.createDiv({ 
      text: 'Select a pin to see its backlinks',
      cls: `${CSS_PREFIX}backlinks-empty-text`
    });
    emptyDiv.createDiv({ 
      text: 'Right-click a pin → "Show backlinks"',
      cls: `${CSS_PREFIX}backlinks-empty-hint`
    });
  }

  /**
   * Render the loading state
   */
  private renderLoading(): void {
    this.contentEl.empty();
    const loadingDiv = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-loading` });
    loadingDiv.createDiv({ cls: `${CSS_PREFIX}backlinks-spinner` });
    loadingDiv.createSpan({ text: 'Searching...' });
  }

  /**
   * Render the backlinks list
   */
  private renderBacklinks(): void {
    this.contentEl.empty();
    
    if (!this.currentPin) {
      this.renderEmptyState();
      return;
    }
    
    // Update title with pin name
    const pinName = this.currentPin.name || 'Unnamed Pin';
    this.titleEl.setText(`Backlinks: ${pinName}`);
    
    if (!this.currentPin.link) {
      const noLinkDiv = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-no-link` });
      noLinkDiv.createDiv({ 
        text: 'This pin has no linked note',
        cls: `${CSS_PREFIX}backlinks-empty-text`
      });
      noLinkDiv.createDiv({ 
        text: 'Link a note to see backlinks',
        cls: `${CSS_PREFIX}backlinks-empty-hint`
      });
      return;
    }
    
    if (this.backlinks.length === 0) {
      const noResultsDiv = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-empty` });
      noResultsDiv.createDiv({ 
        text: 'No backlinks found',
        cls: `${CSS_PREFIX}backlinks-empty-text`
      });
      noResultsDiv.createDiv({ 
        text: 'No notes link to this pin\'s note',
        cls: `${CSS_PREFIX}backlinks-empty-hint`
      });
      return;
    }
    
    // Show count
    const countEl = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-count` });
    countEl.setText(`${this.backlinks.length} note${this.backlinks.length !== 1 ? 's' : ''} linking here`);
    
    // Backlinks list
    const listEl = this.contentEl.createDiv({ cls: `${CSS_PREFIX}backlinks-list` });
    
    for (const backlink of this.backlinks) {
      const itemEl = listEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item` });
      
      // File icon
      const iconEl = itemEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item-icon` });
      iconEl.innerHTML = this.getFileIcon();
      
      // File info
      const infoEl = itemEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item-info` });
      
      // File name
      const nameEl = infoEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item-name` });
      nameEl.setText(backlink.file.basename);
      
      // File path (if in a folder)
      if (backlink.file.parent && backlink.file.parent.path !== '/') {
        const pathEl = infoEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item-path` });
        pathEl.setText(backlink.file.parent.path);
      }
      
      // Link count badge
      if (backlink.count > 1) {
        const countBadge = itemEl.createDiv({ cls: `${CSS_PREFIX}backlinks-item-count` });
        countBadge.setText(`×${backlink.count}`);
        countBadge.setAttribute('title', `${backlink.count} links in this file`);
      }
      
      // Click to open
      itemEl.addEventListener('click', () => {
        this.onBacklinkClick(backlink.file.path);
      });
    }
  }

  /**
   * Show backlinks for a specific pin
   */
  async showForPin(pin: Pin): Promise<void> {
    this.currentPin = pin;
    this.open();
    this.renderLoading();
    
    // Find backlinks
    this.backlinks = await this.findBacklinks(pin);
    this.renderBacklinks();
  }

  /**
   * Find all notes that link to the pin's linked note
   */
  private async findBacklinks(pin: Pin): Promise<BacklinkInfo[]> {
    if (!pin.link) return [];
    
    // Extract the note path from the wikilink
    const linkMatch = pin.link.match(/^\[\[(.+?)(?:\|.+)?\]\]$/);
    if (!linkMatch) return [];
    
    const targetPath = linkMatch[1];
    const backlinks: BacklinkInfo[] = [];
    
    console.log(LOG_PREFIX, 'Finding backlinks for:', targetPath);
    
    // Get all markdown files in the vault
    const files = this.app.vault.getMarkdownFiles();
    
    // Search patterns to look for
    const searchPatterns = [
      `[[${targetPath}]]`,       // Direct link
      `[[${targetPath}|`,        // Aliased link start
    ];
    
    // Also search for partial path matches if targetPath contains a path
    const baseName = targetPath.split('/').pop() || targetPath;
    if (baseName !== targetPath) {
      searchPatterns.push(`[[${baseName}]]`);
      searchPatterns.push(`[[${baseName}|`);
    }
    
    for (const file of files) {
      // Skip the current map file
      if (this.currentFile && file.path === this.currentFile.path) continue;
      
      try {
        const content = await this.app.vault.cachedRead(file);
        let count = 0;
        
        // Count occurrences of any search pattern
        for (const pattern of searchPatterns) {
          const regex = new RegExp(this.escapeRegex(pattern), 'gi');
          const matches = content.match(regex);
          if (matches) {
            count += matches.length;
          }
        }
        
        if (count > 0) {
          backlinks.push({ file, count });
        }
      } catch (error) {
        // Skip files that can't be read
        console.warn(LOG_PREFIX, 'Could not read file:', file.path, error);
      }
    }
    
    // Sort by count (most links first), then alphabetically
    backlinks.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.file.basename.localeCompare(b.file.basename);
    });
    
    console.log(LOG_PREFIX, 'Found backlinks:', backlinks.length);
    return backlinks;
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get SVG icon for a file
   */
  private getFileIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
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
   * Clear the current pin selection
   */
  clearPin(): void {
    this.currentPin = null;
    this.backlinks = [];
    this.renderEmptyState();
  }

  /**
   * Update the current file reference
   */
  setCurrentFile(file: TFile | null): void {
    this.currentFile = file;
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    this.panelEl.remove();
  }
}
