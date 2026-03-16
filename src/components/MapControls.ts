/**
 * MapControls - Custom control bar for the map (bottom-right)
 * Includes: zoom controls, lock pins toggle, clustering toggle, recenter
 */

import * as L from 'leaflet';
import { CSS_PREFIX } from '../constants';

export interface MapControlsOptions {
  /** Current clustering state */
  clusteringEnabled: boolean;
  /** Current lock pins state */
  pinsLocked: boolean;
  /** Callback when zoom in clicked */
  onZoomIn: () => void;
  /** Callback when zoom out clicked */
  onZoomOut: () => void;
  /** Callback when recenter clicked */
  onRecenter: () => void;
  /** Callback when lock pins toggled */
  onToggleLockPins: (locked: boolean) => void;
  /** Callback when clustering toggled */
  onToggleClustering: (enabled: boolean) => void;
  /** Callback when layers panel toggled */
  onToggleLayers?: () => void;
  /** Callback when search panel toggled */
  onToggleSearch?: () => void;
  /** Callback when backlinks panel toggled */
  onToggleBacklinks?: () => void;
  /** Callback when all pins visibility toggled */
  onToggleAllPins?: () => void;
  /** Callback when labels visibility toggled */
  onToggleLabels?: () => void;
}

export class MapControls {
  private container: HTMLElement;
  private map: L.Map;
  private options: MapControlsOptions;
  private zoomDisplay: HTMLElement | null = null;
  private pinsLocked: boolean;
  private clusteringEnabled: boolean;
  private lockButton: HTMLElement | null = null;
  private clusterButton: HTMLElement | null = null;
  private layersButton: HTMLElement | null = null;
  private searchButton: HTMLElement | null = null;
  private backlinksButton: HTMLElement | null = null;
  private labelsButton: HTMLElement | null = null;
  private pinsVisibleButton: HTMLElement | null = null;
  private layersActive = false;
  private searchActive = false;
  private backlinksActive = false;
  private pinsVisible = true;
  private labelsActive = true;

  constructor(map: L.Map, parentContainer: HTMLElement, options: MapControlsOptions) {
    this.map = map;
    this.options = options;
    this.pinsLocked = options.pinsLocked;
    this.clusteringEnabled = options.clusteringEnabled;

    // Create controls container
    this.container = parentContainer.createDiv({ cls: `${CSS_PREFIX}map-controls` });
    
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    // Lock pins toggle
    this.lockButton = this.createButton(
      this.pinsLocked ? 'lock' : 'unlock',
      this.pinsLocked ? 'Pins locked' : 'Pins unlocked',
      () => this.toggleLockPins()
    );
    if (this.pinsLocked) {
      this.lockButton.addClass('active');
    }

    // Clustering toggle
    this.clusterButton = this.createButton(
      'cluster',
      this.clusteringEnabled ? 'Clustering on' : 'Clustering off',
      () => this.toggleClustering()
    );
    if (this.clusteringEnabled) {
      this.clusterButton.addClass('active');
    }

    // Layers/Filter toggle
    if (this.options.onToggleLayers) {
      this.layersButton = this.createButton(
        'filter',
        'Filter by tags',
        () => this.toggleLayers()
      );
    }

    // Search toggle
    if (this.options.onToggleSearch) {
      this.searchButton = this.createButton(
        'search',
        'Search pins',
        () => this.toggleSearch()
      );
    }

    // Backlinks toggle
    if (this.options.onToggleBacklinks) {
      this.backlinksButton = this.createButton(
        'backlinks',
        'Backlinks panel',
        () => this.toggleBacklinks()
      );
    }

    // Toggle all pins visibility
    if (this.options.onToggleAllPins) {
      this.pinsVisibleButton = this.createButton(
        'eye',
        'Show/hide all pins',
        () => this.toggleAllPins()
      );
      // Pins are visible by default
      this.pinsVisibleButton.addClass('active');
    }

    // Labels visibility toggle
    if (this.options.onToggleLabels) {
      this.labelsButton = this.createButton(
        'text',
        'Toggle labels',
        () => this.toggleLabels()
      );
      // Labels are visible by default
      this.labelsButton.addClass('active');
    }

    // Separator
    this.container.createDiv({ cls: `${CSS_PREFIX}controls-separator` });

    // Recenter button
    this.createButton('locate', 'Recenter map', () => this.options.onRecenter());

    // Separator
    this.container.createDiv({ cls: `${CSS_PREFIX}controls-separator` });

    // Zoom out
    this.createButton('minus', 'Zoom out', () => this.options.onZoomOut());

    // Zoom in
    this.createButton('plus', 'Zoom in', () => this.options.onZoomIn());

    // Zoom percentage display
    this.zoomDisplay = this.container.createDiv({ cls: `${CSS_PREFIX}zoom-display` });
    this.updateZoomDisplay();
  }

  private createButton(icon: string, title: string, onClick: () => void): HTMLElement {
    const button = this.container.createDiv({
      cls: `${CSS_PREFIX}control-btn`,
      attr: { 'aria-label': title, title },
    });
    button.innerHTML = this.getIconSvg(icon);
    button.addEventListener('click', onClick);
    return button;
  }

  private setupEventListeners(): void {
    this.map.on('zoomend', () => this.updateZoomDisplay());
  }

  private updateZoomDisplay(): void {
    if (!this.zoomDisplay) return;
    
    const zoom = this.map.getZoom();
    // Convert zoom to percentage (zoom 0 = 100%, each level doubles)
    const percentage = Math.round(Math.pow(2, zoom) * 100);
    this.zoomDisplay.setText(`${percentage}%`);
  }

  private toggleLockPins(): void {
    this.pinsLocked = !this.pinsLocked;
    this.options.onToggleLockPins(this.pinsLocked);
    
    if (this.lockButton) {
      this.lockButton.innerHTML = this.getIconSvg(this.pinsLocked ? 'lock' : 'unlock');
      this.lockButton.setAttribute('title', this.pinsLocked ? 'Pins locked' : 'Pins unlocked');
      this.lockButton.toggleClass('active', this.pinsLocked);
    }
  }

  private toggleClustering(): void {
    this.clusteringEnabled = !this.clusteringEnabled;
    this.options.onToggleClustering(this.clusteringEnabled);
    
    if (this.clusterButton) {
      this.clusterButton.setAttribute('title', this.clusteringEnabled ? 'Clustering on' : 'Clustering off');
      this.clusterButton.toggleClass('active', this.clusteringEnabled);
    }
  }

  private toggleLayers(): void {
    this.layersActive = !this.layersActive;
    this.options.onToggleLayers?.();
    
    if (this.layersButton) {
      this.layersButton.toggleClass('active', this.layersActive);
    }
  }

  /** Update layers button active state */
  setLayersActive(active: boolean): void {
    this.layersActive = active;
    if (this.layersButton) {
      this.layersButton.toggleClass('active', active);
    }
  }

  private toggleSearch(): void {
    this.searchActive = !this.searchActive;
    this.options.onToggleSearch?.();
    
    if (this.searchButton) {
      this.searchButton.toggleClass('active', this.searchActive);
    }
  }

  /** Update search button active state */
  setSearchActive(active: boolean): void {
    this.searchActive = active;
    if (this.searchButton) {
      this.searchButton.toggleClass('active', active);
    }
  }

  private toggleBacklinks(): void {
    this.backlinksActive = !this.backlinksActive;
    this.options.onToggleBacklinks?.();
    
    if (this.backlinksButton) {
      this.backlinksButton.toggleClass('active', this.backlinksActive);
    }
  }

  /** Update backlinks button active state */
  setBacklinksActive(active: boolean): void {
    this.backlinksActive = active;
    if (this.backlinksButton) {
      this.backlinksButton.toggleClass('active', active);
    }
  }

  private toggleAllPins(): void {
    this.pinsVisible = !this.pinsVisible;
    this.options.onToggleAllPins?.();

    if (this.pinsVisibleButton) {
      this.pinsVisibleButton.innerHTML = this.getIconSvg(this.pinsVisible ? 'eye' : 'eye-off');
      this.pinsVisibleButton.setAttribute('title', this.pinsVisible ? 'Hide all pins' : 'Show all pins');
      this.pinsVisibleButton.toggleClass('active', this.pinsVisible);
    }
  }

  /** Update pins visible button state */
  setPinsVisibleState(visible: boolean): void {
    this.pinsVisible = visible;
    if (this.pinsVisibleButton) {
      this.pinsVisibleButton.innerHTML = this.getIconSvg(visible ? 'eye' : 'eye-off');
      this.pinsVisibleButton.setAttribute('title', visible ? 'Hide all pins' : 'Show all pins');
      this.pinsVisibleButton.toggleClass('active', visible);
    }
  }

  private toggleLabels(): void {
    this.labelsActive = !this.labelsActive;
    this.options.onToggleLabels?.();

    if (this.labelsButton) {
      this.labelsButton.toggleClass('active', this.labelsActive);
    }
  }

  /** Update labels button active state */
  setLabelsActive(active: boolean): void {
    this.labelsActive = active;
    if (this.labelsButton) {
      this.labelsButton.toggleClass('active', active);
    }
  }

  /** Update lock state from external source */
  setLockState(locked: boolean): void {
    this.pinsLocked = locked;
    if (this.lockButton) {
      this.lockButton.innerHTML = this.getIconSvg(locked ? 'lock' : 'unlock');
      this.lockButton.setAttribute('title', locked ? 'Pins locked' : 'Pins unlocked');
      this.lockButton.toggleClass('active', locked);
    }
  }

  /** Update clustering state from external source */
  setClusteringState(enabled: boolean): void {
    this.clusteringEnabled = enabled;
    if (this.clusterButton) {
      this.clusterButton.setAttribute('title', enabled ? 'Clustering on' : 'Clustering off');
      this.clusterButton.toggleClass('active', enabled);
    }
  }

  private getIconSvg(icon: string): string {
    const icons: Record<string, string> = {
      'plus': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      'minus': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      'lock': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
      'unlock': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
      'cluster': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><circle cx="19" cy="5" r="2"></circle><circle cx="5" cy="5" r="2"></circle><circle cx="19" cy="19" r="2"></circle><circle cx="5" cy="19" r="2"></circle><line x1="12" y1="9" x2="12" y2="5"></line><line x1="14.5" y1="13.5" x2="17.5" y2="17.5"></line><line x1="9.5" y1="13.5" x2="6.5" y2="17.5"></line></svg>',
      'filter': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
      'search': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
      'backlinks': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
      'locate': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>',
      'text': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
      'eye': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      'eye-off': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    };
    return icons[icon] || '';
  }

  destroy(): void {
    this.container.remove();
  }
}
