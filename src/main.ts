/**
 * TRPG Maps - Interactive maps with pins for tabletop RPG
 *
 * Main plugin entry point
 */

import { Plugin, TFile, WorkspaceLeaf, MarkdownView, Notice } from 'obsidian';
import type { TRPGMapsSettings } from './types';
import { DEFAULT_SETTINGS, VIEW_TYPE_MAP, LOG_PREFIX } from './constants';
import { MapView } from './MapView';
import { PinManager } from './PinManager';
import { TRPGMapsSettingsTab } from './SettingsTab';
import { parseFrontmatter } from './utils/frontmatter';
import { loadFAProCSS, unloadFAProCSS } from './data/fontawesome-pro';

// Note: Leaflet CSS is included in styles.css

export default class TRPGMapsPlugin extends Plugin {
  settings: TRPGMapsSettings = DEFAULT_SETTINGS;
  pinManager!: PinManager;

  async onload(): Promise<void> {
    console.log(LOG_PREFIX, 'Loading plugin...');

    // Load Font Awesome Pro CSS from CDN
    loadFAProCSS();

    // Load settings
    await this.loadSettings();

    // Initialize PinManager
    this.pinManager = new PinManager(this.app);

    // Register the map view
    this.registerView(VIEW_TYPE_MAP, (leaf) => new MapView(leaf, this));

    // Add settings tab
    this.addSettingTab(new TRPGMapsSettingsTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon('map', 'TRPG Maps', () => {
      this.toggleMapViewForActiveFile();
    });

    // Add command to toggle map view
    this.addCommand({
      id: 'toggle-map-view',
      name: 'Toggle Map View',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (file && this.hasMapImageSync(file)) {
          if (!checking) {
            this.toggleMapViewForActiveFile();
          }
          return true;
        }
        return false;
      },
    });

    // Add command to open as map (always available)
    this.addCommand({
      id: 'open-as-map',
      name: 'Open current file as map',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
          if (!checking) {
            this.openMapView(file);
          }
          return true;
        }
        return false;
      },
    });

    // Add command to switch to article view
    this.addCommand({
      id: 'open-as-article',
      name: 'Open current file as article',
      checkCallback: (checking: boolean) => {
        const mapView = this.app.workspace.getActiveViewOfType(MapView);
        if (mapView && mapView.currentFile) {
          if (!checking) {
            this.openArticleView(mapView.currentFile);
          }
          return true;
        }
        return false;
      },
    });

    // Register view actions for markdown views (the toggle button)
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        this.updateViewActions(leaf);
      })
    );

    // Also update when file changes
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file) {
          setTimeout(() => {
            const leaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
            if (leaf) {
              this.updateViewActions(leaf);
            }
          }, 100);
        }
      })
    );

    console.log(LOG_PREFIX, 'Plugin loaded');
  }

  onunload(): void {
    console.log(LOG_PREFIX, 'Unloading plugin...');
    unloadFAProCSS();
  }

  /**
   * Check if a file has a map-image in frontmatter
   */
  async hasMapImage(file: TFile): Promise<boolean> {
    try {
      const content = await this.app.vault.read(file);
      const mapData = parseFrontmatter(content);
      return !!(mapData && mapData['map-image']);
    } catch {
      return false;
    }
  }

  /**
   * Check synchronously if file has map-image (cached metadata)
   */
  hasMapImageSync(file: TFile): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    return !!(frontmatter && frontmatter['map-image']);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Update view actions (toggle button) for a leaf
   */
  private updateViewActions(leaf: WorkspaceLeaf | null): void {
    if (!leaf) return;

    const view = leaf.view;
    
    // For markdown views, check if file has map-image and add toggle button
    if (view instanceof MarkdownView) {
      const file = view.file;
      if (file && this.hasMapImageSync(file)) {
        this.addMapToggleAction(leaf, file, 'article');
      }
    }
    
    // For map views, add toggle button to go back to article
    if (view instanceof MapView && view.currentFile) {
      this.addMapToggleAction(leaf, view.currentFile, 'map');
    }
  }

  /**
   * Add the map toggle action button to the view
   */
  private addMapToggleAction(leaf: WorkspaceLeaf, file: TFile, currentMode: 'article' | 'map'): void {
    // Remove existing action if any
    const existingAction = leaf.view.containerEl.querySelector('.trpg-view-toggle');
    if (existingAction) {
      existingAction.remove();
    }

    // Create toggle button container
    const viewHeader = leaf.view.containerEl.querySelector('.view-header-nav-buttons');
    if (!viewHeader) return;

    const toggleBtn = createEl('button', {
      cls: 'clickable-icon view-action trpg-view-toggle',
      attr: {
        'aria-label': currentMode === 'article' ? 'Open Map View' : 'Open Article View',
      },
    });

    // Add icon
    const iconName = currentMode === 'article' ? 'map' : 'file-text';
    const iconSvg = this.getIconSvg(iconName);
    toggleBtn.innerHTML = iconSvg;

    toggleBtn.onclick = () => {
      if (currentMode === 'article') {
        this.openMapView(file);
      } else {
        this.openArticleView(file);
      }
    };

    viewHeader.appendChild(toggleBtn);
  }

  /**
   * Get SVG for an icon
   */
  private getIconSvg(iconName: string): string {
    const icons: Record<string, string> = {
      'map': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
      'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
    };
    return icons[iconName] || '';
  }

  /**
   * Toggle between map and article view for the active file
   */
  async toggleMapViewForActiveFile(): Promise<void> {
    // Check if we're in a map view
    const mapView = this.app.workspace.getActiveViewOfType(MapView);
    if (mapView && mapView.currentFile) {
      await this.openArticleView(mapView.currentFile);
      return;
    }

    // Check if we're in a markdown view
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (markdownView && markdownView.file) {
      const hasMap = await this.hasMapImage(markdownView.file);
      if (hasMap) {
        await this.openMapView(markdownView.file);
      } else {
        new Notice('This file has no map-image in frontmatter');
      }
      return;
    }

    new Notice('No active file');
  }

  /**
   * Open the map view for a file (in the same leaf)
   */
  async openMapView(file: TFile): Promise<void> {
    const { workspace } = this.app;
    // Get the active leaf - this ensures we use the current tab
    const leaf = workspace.getActiveViewOfType(MarkdownView)?.leaf 
      ?? workspace.getMostRecentLeaf();

    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_MAP,
        state: { file: file.path },
      });
    }
  }

  /**
   * Open the article (markdown) view for a file (in the same leaf)
   */
  async openArticleView(file: TFile): Promise<void> {
    const { workspace } = this.app;
    // Get the active leaf from map view or most recent
    const leaf = workspace.getActiveViewOfType(MapView)?.leaf 
      ?? workspace.getMostRecentLeaf();

    if (leaf) {
      await leaf.setViewState({
        type: 'markdown',
        state: { file: file.path, mode: 'source' },
      });
    }
  }
}
