/**
 * MapView - Main Leaflet-based map view for TRPG Maps
 */

import { ItemView, WorkspaceLeaf, TFile, Notice, Menu } from 'obsidian';
import * as L from 'leaflet';
import type { Pin, Label, MapData } from './types';

// leaflet.markercluster needs L to be global
// Set it before requiring the plugin
(window as unknown as { L: typeof L }).L = L;
require('leaflet.markercluster');
import type TRPGMapsPlugin from './main';
import {
  VIEW_TYPE_MAP,
  LEAFLET_CONFIG,
  LOG_PREFIX,
  EVENTS,
  CSS_PREFIX,
} from './constants';
import { parseFrontmatter } from './utils/frontmatter';
import { getImageBounds, latLngToImage, imageToLatLng } from './utils/coordinates';
import { createPinMarker, processMarkerIcons, updateMarkerIcon } from './components/PinMarker';
import { GridOverlay } from './components/GridOverlay';
import { MapControls } from './components/MapControls';
import { LayersPanel } from './components/LayersPanel';
import { SearchPanel } from './components/SearchPanel';
import { BacklinksPanel } from './components/BacklinksPanel';
import { CreatePinModal } from './modals/CreatePinModal';
import { EditPinModal } from './modals/EditPinModal';
import { CreateLabelModal } from './modals/CreateLabelModal';
import { EditLabelModal } from './modals/EditLabelModal';
import { createLabelMarker, updateLabelMarkerIcon } from './components/LabelMarker';

export class MapView extends ItemView {
  static VIEW_TYPE = VIEW_TYPE_MAP;

  plugin: TRPGMapsPlugin;
  private mapContainer: HTMLDivElement | null = null;
  private map: L.Map | null = null;
  private imageOverlay: L.ImageOverlay | null = null;
  private markersLayer: L.LayerGroup | null = null;
  currentFile: TFile | null = null;
  private mapData: MapData | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private markers: Map<string, L.Marker> = new Map();
  private labelsLayer: L.LayerGroup | null = null;
  private labelMarkers: Map<string, L.Marker> = new Map();
  private labelsVisible = true;
  private gridOverlay: GridOverlay | null = null;
  private mapControls: MapControls | null = null;
  private layersPanel: LayersPanel | null = null;
  private searchPanel: SearchPanel | null = null;
  private backlinksPanel: BacklinksPanel | null = null;
  private pinsLocked = false;
  private clusteringEnabled = true;
  private visibleTags: Set<string> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: TRPGMapsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MapView.VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.currentFile?.basename
      ? `${this.currentFile.basename} - Map`
      : 'TRPG Map';
  }

  getIcon(): string {
    return 'map';
  }

  async onOpen(): Promise<void> {
    console.log(LOG_PREFIX, 'MapView onOpen called');
    this.renderLoading();
  }

  async onClose(): Promise<void> {
    console.log(LOG_PREFIX, 'MapView onClose called');
    this.cleanupMap();
  }

  private renderLoading(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass(`${CSS_PREFIX}map-container`);

    const loadingDiv = container.createDiv({ cls: `${CSS_PREFIX}loading` });
    loadingDiv.createDiv({ cls: `${CSS_PREFIX}loading-spinner` });
    loadingDiv.createSpan({ text: 'Loading map...' });
  }

  private renderError(message: string): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass(`${CSS_PREFIX}map-container`);

    const errorDiv = container.createDiv({ cls: `${CSS_PREFIX}error` });
    errorDiv.createDiv({ cls: `${CSS_PREFIX}error-icon`, text: '⚠️' });
    errorDiv.createDiv({ cls: `${CSS_PREFIX}error-message`, text: message });
  }

  private cleanupMap(): void {
    if (this.backlinksPanel) {
      this.backlinksPanel.destroy();
      this.backlinksPanel = null;
    }
    if (this.searchPanel) {
      this.searchPanel.destroy();
      this.searchPanel = null;
    }
    if (this.layersPanel) {
      this.layersPanel.destroy();
      this.layersPanel = null;
    }
    if (this.mapControls) {
      this.mapControls.destroy();
      this.mapControls = null;
    }
    if (this.gridOverlay) {
      this.gridOverlay.destroy();
      this.gridOverlay = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.imageOverlay = null;
    this.markersLayer = null;
    this.markers.clear();
    this.labelsLayer = null;
    this.labelMarkers.clear();
    this.mapContainer = null;
    this.visibleTags = null;
  }

  /**
   * Load a .map.md file and display it
   */
  async loadFile(filePath: string): Promise<void> {
    console.log(LOG_PREFIX, 'loadFile called with:', filePath);

    if (!filePath) {
      console.warn(LOG_PREFIX, 'No file path provided');
      this.renderError('No file specified');
      return;
    }

    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        throw new Error(`File not found: ${filePath}`);
      }

      this.currentFile = file;
      // Update the tab title and view header title
      (this.leaf as any).updateHeader();

      // Also update the view header title container (Obsidian doesn't always refresh it)
      const titleContainer = this.containerEl.querySelector('.view-header-title-container .view-header-title');
      if (titleContainer) {
        titleContainer.textContent = this.getDisplayText();
      }

      const content = await this.app.vault.read(file);
      console.log(LOG_PREFIX, 'File content loaded, parsing frontmatter...');
      
      this.mapData = parseFrontmatter(content);

      if (!this.mapData) {
        throw new Error('Invalid map file: missing or invalid frontmatter');
      }

      console.log(LOG_PREFIX, 'Frontmatter parsed:', this.mapData);

      // Initialize the map UI
      await this.initializeMap();

      // Trigger map loaded event
      this.app.workspace.trigger(EVENTS.MAP_LOADED, {
        filePath,
        mapData: this.mapData,
      });

      console.log(LOG_PREFIX, 'Map loaded successfully');
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to load map file:', error);
      this.renderError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async initializeMap(): Promise<void> {
    console.log(LOG_PREFIX, 'Initializing map...');

    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass(`${CSS_PREFIX}map-container`);

    // Create map container div - hidden initially to prevent visual jumps
    this.mapContainer = container.createDiv({ cls: `${CSS_PREFIX}map` });
    this.mapContainer.style.visibility = 'hidden';

    // Initialize clustering state from settings
    this.clusteringEnabled = this.plugin.settings.enableClustering;

    // Initialize Leaflet map with a default view
    this.map = L.map(this.mapContainer, {
      crs: L.CRS.Simple,
      minZoom: LEAFLET_CONFIG.MIN_ZOOM,
      maxZoom: LEAFLET_CONFIG.MAX_ZOOM,
      zoomSnap: LEAFLET_CONFIG.ZOOM_SNAP,
      zoomDelta: LEAFLET_CONFIG.ZOOM_DELTA,
      wheelPxPerZoomLevel: LEAFLET_CONFIG.WHEEL_PX_PER_ZOOM,
      attributionControl: false,
      zoomControl: false, // We use custom controls
      maxBoundsViscosity: 0, // No bounce back when dragging outside bounds
      // Disable Leaflet's zoom animation - we use CSS transitions instead for smoother sync
      zoomAnimation: false,
    });

    // Set initial view to prevent "Set map center and zoom first" error
    this.map.setView([0, 0], 0);

    // Create markers layer (with or without clustering based on settings)
    this.markersLayer = this.createMarkersLayer();

    // Set up context menu for creating pins
    this.map.on('contextmenu', (event: L.LeafletMouseEvent) => {
      if (this.imageHeight > 0) {
        this.handleMapContextMenu(event);
      }
    });

    // Load the map image
    await this.loadMapImage();

    // Load pins
    this.loadPins();

    // TODO: Labels feature hidden for now
    // this.loadLabels();

    // Initialize grid overlay if enabled
    this.initGridOverlay();

    // Initialize custom map controls
    this.initMapControls();
  }

  /**
   * Load and display the map image
   */
  private async loadMapImage(): Promise<void> {
    if (!this.map || !this.mapData) return;

    const rawValue = this.mapData['map-image'];
    if (!rawValue) {
      throw new Error('Map image path not specified in frontmatter. Add map-image: "path/to/image.png" to your frontmatter.');
    }

    // Obsidian parses [[link]] in YAML as an array ["link"], normalize to string
    const imagePath = Array.isArray(rawValue) ? String(rawValue[0]) : String(rawValue);

    console.log(LOG_PREFIX, 'Loading image:', imagePath);

    // Resolve image path: try direct path first, then resolve as link name
    let imageFile: TFile | null = null;
    const wikilinkMatch = imagePath.match(/^\[\[(.+)\]\]$/);
    const linkText = wikilinkMatch ? wikilinkMatch[1] : imagePath;

    // Try direct path first
    const abstract = this.app.vault.getAbstractFileByPath(linkText);
    if (abstract instanceof TFile) {
      imageFile = abstract;
    }

    // Fallback: resolve as link (handles bare filenames and wikilinks stripped by Obsidian)
    if (!imageFile) {
      const resolved = this.app.metadataCache.getFirstLinkpathDest(linkText, this.currentFile?.path ?? '');
      if (resolved instanceof TFile) {
        imageFile = resolved;
      }
    }

    if (!imageFile) {
      throw new Error(`Map image not found: ${imagePath}. Make sure the path is correct (supports wikilinks like [[image]] or full paths like folder/image.png).`);
    }

    // Get image URL
    const imageUrl = this.app.vault.getResourcePath(imageFile);
    console.log(LOG_PREFIX, 'Image URL:', imageUrl);

    // Load image to get dimensions
    const dimensions = await this.getImageDimensions(imageUrl);
    this.imageWidth = dimensions.width;
    this.imageHeight = dimensions.height;

    console.log(LOG_PREFIX, 'Image dimensions:', this.imageWidth, 'x', this.imageHeight);

    // Remove existing overlay if any
    if (this.imageOverlay) {
      this.imageOverlay.remove();
    }

    // Create image overlay
    const bounds = getImageBounds(this.imageWidth, this.imageHeight);
    this.imageOverlay = L.imageOverlay(imageUrl, bounds).addTo(this.map);

    // No maxBounds - allow free panning like LegendKeeper

    // Force invalidateSize first to ensure container has correct dimensions
    this.map.invalidateSize();
    
    // Calculate the center of the image
    const center = bounds.getCenter();
    
    // Check if a specific zoom is set in the map's frontmatter
    const mapSpecificZoom = this.mapData['default-zoom'];
    
    if (mapSpecificZoom !== undefined && mapSpecificZoom !== null) {
      // Use the map-specific zoom if defined in frontmatter
      this.map.setView(center, mapSpecificZoom, { animate: false });
    } else {
      // Default: fit bounds to show the entire image, with some padding
      this.map.fitBounds(bounds, { padding: [20, 20], animate: false });
    }

    // Show the map now that it's properly positioned
    if (this.mapContainer) {
      this.mapContainer.style.visibility = 'visible';
    }
  }

  /**
   * Get image dimensions by loading it
   */
  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image. Check that the file exists and is a valid image.'));
      };
      img.src = url;
    });
  }

  /**
   * Load and display all pins from map data
   */
  private loadPins(): void {
    if (!this.markersLayer || !this.mapData) return;

    // Clear existing markers
    this.markersLayer.clearLayers();
    this.markers.clear();

    const pins = this.mapData.pins ?? [];
    console.log(LOG_PREFIX, 'Loading', pins.length, 'pins');

    for (const pin of pins) {
      this.addPinMarker(pin);
    }
  }

  /**
   * Initialize the grid overlay based on settings
   */
  private initGridOverlay(): void {
    console.log(LOG_PREFIX, 'initGridOverlay called', {
      hasMap: !!this.map,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
    });

    if (!this.map || this.imageWidth === 0 || this.imageHeight === 0) {
      console.log(LOG_PREFIX, 'Grid overlay skipped - missing map or dimensions');
      return;
    }

    // Clean up existing grid
    if (this.gridOverlay) {
      this.gridOverlay.destroy();
      this.gridOverlay = null;
    }

    const settings = this.plugin.settings;
    console.log(LOG_PREFIX, 'Grid settings:', {
      showGrid: settings.showGrid,
      gridSize: settings.gridSize,
      gridType: settings.gridType,
    });
    
    this.gridOverlay = new GridOverlay(
      this.map,
      this.imageWidth,
      this.imageHeight,
      settings.gridSize,
      settings.gridType,
      settings.showGrid
    );

    console.log(LOG_PREFIX, 'Grid overlay created, visible:', this.gridOverlay.isVisible());
  }

  /**
   * Initialize custom map controls (bottom-right)
   */
  private initMapControls(): void {
    if (!this.map || !this.mapContainer) return;

    // Clean up existing controls
    if (this.mapControls) {
      this.mapControls.destroy();
      this.mapControls = null;
    }

    const container = this.containerEl.children[1] as HTMLElement;
    
    this.mapControls = new MapControls(this.map, container, {
      clusteringEnabled: this.clusteringEnabled,
      pinsLocked: this.pinsLocked,
      onZoomIn: () => this.map?.zoomIn(),
      onZoomOut: () => this.map?.zoomOut(),
      onRecenter: () => this.recenterMap(),
      onToggleLockPins: (locked) => this.setLockPins(locked),
      onToggleClustering: (enabled) => this.toggleClustering(enabled),
      onToggleLayers: () => this.toggleLayersPanel(),
      onToggleSearch: () => this.toggleSearchPanel(),
      onToggleBacklinks: () => this.toggleBacklinksPanel(),
      // TODO: Labels feature hidden for now
      // onToggleLabels: () => this.toggleLabelsVisibility(),
    });
    
    // Initialize layers panel
    this.initLayersPanel();
    
    // Initialize search panel
    this.initSearchPanel();
    
    // Initialize backlinks panel
    this.initBacklinksPanel();
  }

  /**
   * Initialize the layers panel for tag filtering
   */
  private initLayersPanel(): void {
    if (!this.mapData) return;
    
    const container = this.containerEl.children[1] as HTMLElement;
    const pins = this.mapData.pins ?? [];
    
    // Clean up existing panel
    if (this.layersPanel) {
      this.layersPanel.destroy();
      this.layersPanel = null;
    }
    
    this.layersPanel = new LayersPanel({
      container,
      pins,
      onVisibilityChange: (visibleTags) => {
        this.visibleTags = visibleTags;
        this.filterPinsByTags();
      },
    });
  }

  /**
   * Toggle the layers panel visibility
   */
  private toggleLayersPanel(): void {
    if (this.layersPanel) {
      this.layersPanel.toggle();
      this.mapControls?.setLayersActive(this.layersPanel.isVisible());
    }
  }

  /**
   * Filter pins based on visible tags
   */
  private filterPinsByTags(): void {
    if (!this.layersPanel) return;
    
    // Update visibility of each marker
    this.markers.forEach((marker, pinId) => {
      const pin = this.mapData?.pins?.find(p => p.id === pinId);
      if (!pin) return;
      
      const isVisible = this.layersPanel!.isPinVisible(pin);
      const element = marker.getElement();
      
      if (element) {
        element.style.display = isVisible ? '' : 'none';
      }
    });
  }

  /**
   * Initialize the search panel
   */
  private initSearchPanel(): void {
    if (!this.mapData) return;
    
    const container = this.containerEl.children[1] as HTMLElement;
    const pins = this.mapData.pins ?? [];
    
    // Clean up existing panel
    if (this.searchPanel) {
      this.searchPanel.destroy();
      this.searchPanel = null;
    }
    
    this.searchPanel = new SearchPanel({
      container,
      pins,
      onPinSelect: (pin) => {
        this.zoomToPin(pin);
        this.searchPanel?.close();
        this.mapControls?.setSearchActive(false);
      },
    });
  }

  /**
   * Toggle the search panel visibility
   */
  private toggleSearchPanel(): void {
    if (this.searchPanel) {
      this.searchPanel.toggle();
      this.mapControls?.setSearchActive(this.searchPanel.isVisible());
    }
  }

  /**
   * Initialize the backlinks panel
   */
  private initBacklinksPanel(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    
    // Clean up existing panel
    if (this.backlinksPanel) {
      this.backlinksPanel.destroy();
      this.backlinksPanel = null;
    }
    
    this.backlinksPanel = new BacklinksPanel({
      app: this.app,
      container,
      currentFile: this.currentFile,
      onBacklinkClick: (filePath) => {
        this.app.workspace.openLinkText(filePath, this.currentFile?.path ?? '', false);
      },
    });
  }

  /**
   * Toggle the backlinks panel visibility
   */
  private toggleBacklinksPanel(): void {
    if (this.backlinksPanel) {
      this.backlinksPanel.toggle();
      this.mapControls?.setBacklinksActive(this.backlinksPanel.isVisible());
    }
  }

  /**
   * Show backlinks for a specific pin
   */
  private showPinBacklinks(pin: Pin): void {
    if (this.backlinksPanel) {
      this.backlinksPanel.showForPin(pin);
      this.mapControls?.setBacklinksActive(true);
    }
  }

  /**
   * Zoom to a specific pin and highlight it
   */
  private zoomToPin(pin: Pin): void {
    if (!this.map) return;
    
    const marker = this.markers.get(pin.id);
    if (marker) {
      // Get the marker's position
      const latlng = marker.getLatLng();
      
      // Zoom to the pin with animation
      this.map.setView(latlng, Math.max(this.map.getZoom(), 1), { animate: true });
      
      // Open the tooltip briefly to show the pin name
      marker.openTooltip();
      
      // Pulse animation on the marker
      const element = marker.getElement();
      if (element) {
        element.addClass(`${CSS_PREFIX}pin-highlight`);
        setTimeout(() => {
          element.removeClass(`${CSS_PREFIX}pin-highlight`);
        }, 2000);
      }
    }
  }

  /**
   * Recenter the map to show the full image
   */
  private recenterMap(): void {
    if (!this.map || this.imageWidth === 0 || this.imageHeight === 0) return;
    
    const bounds = getImageBounds(this.imageWidth, this.imageHeight);
    this.map.fitBounds(bounds, { padding: [20, 20], animate: true });
  }

  /**
   * Lock/unlock pin dragging
   */
  private setLockPins(locked: boolean): void {
    this.pinsLocked = locked;

    // Update all pin markers' draggable state
    this.markers.forEach((marker) => {
      if (locked) {
        marker.dragging?.disable();
      } else {
        marker.dragging?.enable();
      }
    });

    // Update all label markers' draggable state
    this.labelMarkers.forEach((marker) => {
      if (locked) {
        marker.dragging?.disable();
      } else {
        marker.dragging?.enable();
      }
    });

    console.log(LOG_PREFIX, 'Pins/labels locked:', locked);
  }

  /**
   * Toggle clustering on/off (requires reloading pins)
   */
  private toggleClustering(enabled: boolean): void {
    this.clusteringEnabled = enabled;
    
    // Remove current markers layer
    if (this.markersLayer) {
      this.markersLayer.remove();
    }
    
    // Create new markers layer with updated clustering state
    this.markersLayer = this.createMarkersLayer();
    
    // Reload all pins
    this.markers.clear();
    this.loadPins();
    
    console.log(LOG_PREFIX, 'Clustering toggled:', enabled);
  }

  /**
   * Create the markers layer (clustered or regular based on local state)
   */
  private createMarkersLayer(): L.LayerGroup {
    const settings = this.plugin.settings;
    
    if (this.clusteringEnabled) {
      console.log(LOG_PREFIX, 'Creating clustered markers layer');
      // Create a MarkerClusterGroup with custom options
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: settings.clusterThreshold,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: LEAFLET_CONFIG.MAX_ZOOM,
        // Animation options
        animate: true,
        animateAddingMarkers: true,
        spiderfyDistanceMultiplier: 1.5,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 'small';
          if (count >= 10) size = 'medium';
          if (count >= 50) size = 'large';
          
          return L.divIcon({
            html: `<div class="${CSS_PREFIX}cluster-icon ${CSS_PREFIX}cluster-${size}"><span>${count}</span></div>`,
            className: `${CSS_PREFIX}cluster-marker`,
            iconSize: L.point(40, 40),
          });
        },
      });
      clusterGroup.addTo(this.map!);
      return clusterGroup;
    } else {
      console.log(LOG_PREFIX, 'Creating regular markers layer (no clustering)');
      return L.layerGroup().addTo(this.map!);
    }
  }

  /**
   * Add a single pin marker to the map
   */
  private addPinMarker(pin: Pin): void {
    if (!this.markersLayer) return;

    const marker = createPinMarker(pin, this.imageHeight, {
      draggable: !this.pinsLocked,
      onClick: (p) => this.handlePinClick(p),
      onContextMenu: (p, event) => this.handlePinContextMenu(p, event),
      onDragStart: () => this.mapContainer?.classList.add('trpg-dragging-pin'),
      onDragEnd: (p, newX, newY) => {
        this.mapContainer?.classList.remove('trpg-dragging-pin');
        this.handlePinDragEnd(p, newX, newY);
      },
      onMouseOver: (p, event) => this.handlePinMouseOver(p, event),
      onMouseOut: () => this.handlePinMouseOut(),
    });

    marker.addTo(this.markersLayer);
    this.markers.set(pin.id, marker);

    // Process icons after marker is added to DOM (apply correct color)
    setTimeout(() => processMarkerIcons(marker, pin.color), 0);
  }

  /**
   * Handle click on a pin
   */
  private handlePinClick(pin: Pin): void {
    if (pin.link) {
      const linkMatch = pin.link.match(/^\[\[(.+?)(?:\|.+)?\]\]$/);
      if (linkMatch) {
        const notePath = linkMatch[1];
        this.app.workspace.openLinkText(notePath, this.currentFile?.path ?? '', false);
      }
    }
  }

  /**
   * Handle mouse over on a pin - show Obsidian's native page preview
   */
  private handlePinMouseOver(pin: Pin, event: L.LeafletMouseEvent): void {
    if (!pin.link) return;

    const linkMatch = pin.link.match(/^\[\[(.+?)(?:\|.+)?\]\]$/);
    if (!linkMatch) return;

    const notePath = linkMatch[1];
    const targetEl = event.originalEvent.target as HTMLElement;
    
    // Find the marker element (the parent container)
    const markerEl = targetEl.closest('.trpg-pin-container') as HTMLElement ?? targetEl;
    
    // Trigger Obsidian's native hover preview
    // We need to set the data attribute that Obsidian looks for
    markerEl.setAttribute('data-href', notePath);
    markerEl.addClass('internal-link');
    
    this.app.workspace.trigger('hover-link', {
      event: event.originalEvent,
      source: 'preview',
      hoverParent: this.leaf.view,
      targetEl: markerEl,
      linktext: notePath,
      sourcePath: this.currentFile?.path ?? '',
    });
  }

  /**
   * Handle mouse out on a pin
   */
  private handlePinMouseOut(): void {
    // The hover preview closes automatically when mouse leaves
  }

  /**
   * Handle right-click on a pin
   */
  private handlePinContextMenu(pin: Pin, event: L.LeafletMouseEvent): void {
    // Get fresh pin data from mapData (in case it was edited)
    const currentPin = this.mapData?.pins?.find((p) => p.id === pin.id) ?? pin;
    
    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle('Edit pin')
        .setIcon('pencil')
        .onClick(() => this.editPin(currentPin))
    );

    menu.addItem((item) =>
      item
        .setTitle('Delete pin')
        .setIcon('trash')
        .onClick(() => this.deletePin(currentPin))
    );

    if (currentPin.link) {
      menu.addItem((item) =>
        item
          .setTitle('Open linked note')
          .setIcon('link')
          .onClick(() => this.handlePinClick(currentPin))
      );
      
      menu.addItem((item) =>
        item
          .setTitle('Show backlinks')
          .setIcon('links-coming-in')
          .onClick(() => this.showPinBacklinks(currentPin))
      );
    } else {
      // Only show "Create note" if pin doesn't have a link yet
      menu.addItem((item) =>
        item
          .setTitle('Create linked note')
          .setIcon('file-plus')
          .onClick(() => this.createNoteFromPin(currentPin))
      );
    }

    menu.showAtMouseEvent(event.originalEvent);
  }

  /**
   * Handle pin drag end
   */
  private async handlePinDragEnd(pin: Pin, newX: number, newY: number): Promise<void> {
    try {
      const updatedPin: Pin = { ...pin, x: newX, y: newY };
      await this.plugin.pinManager.updatePin(this.currentFile!, updatedPin);

      const existingPin = this.mapData?.pins?.find((p) => p.id === pin.id);
      if (existingPin) {
        existingPin.x = newX;
        existingPin.y = newY;
      }
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to update pin position:', error);
      new Notice('Failed to save pin position');

      const marker = this.markers.get(pin.id);
      if (marker) {
        marker.setLatLng(imageToLatLng(pin.x, pin.y, this.imageHeight));
      }
    }
  }

  /**
   * Handle right-click on the map (not on a pin)
   */
  private handleMapContextMenu(event: L.LeafletMouseEvent): void {
    const menu = new Menu();
    const coords = latLngToImage(event.latlng, this.imageHeight);

    menu.addItem((item) =>
      item
        .setTitle('New pin')
        .setIcon('map-pin')
        .onClick(() => this.createNewPin(coords.x, coords.y))
    );

    // TODO: Labels feature hidden for now
    // menu.addItem((item) =>
    //   item
    //     .setTitle('New label')
    //     .setIcon('type')
    //     .onClick(() => this.createNewLabel(coords.x, coords.y))
    // );

    menu.showAtMouseEvent(event.originalEvent);
  }

  /**
   * Create a new pin at the specified coordinates
   */
  private createNewPin(x: number, y: number): void {
    const modal = new CreatePinModal(this.app, this.plugin, { x, y }, async (pinData) => {
      try {
        const newPin = await this.plugin.pinManager.createPin(this.currentFile!, pinData);

        if (!this.mapData!.pins) {
          this.mapData!.pins = [];
        }
        this.mapData!.pins.push(newPin);

        this.addPinMarker(newPin);

        new Notice(`Pin "${newPin.name}" created`);
      } catch (error) {
        console.error(LOG_PREFIX, 'Failed to create pin:', error);
        new Notice('Failed to create pin');
      }
    });

    modal.open();
  }

  /**
   * Edit an existing pin
   */
  private editPin(pin: Pin): void {
    const modal = new EditPinModal(this.app, this.plugin, pin, async (updatedPin) => {
      try {
        // Save to file
        await this.plugin.pinManager.updatePin(this.currentFile!, updatedPin);

        // Update local map data
        if (this.mapData?.pins) {
          const index = this.mapData.pins.findIndex((p) => p.id === pin.id);
          if (index !== -1) {
            this.mapData.pins[index] = updatedPin;
          }
        }

        // Update the marker on the map
        const marker = this.markers.get(pin.id);
        if (marker) {
          updateMarkerIcon(marker, updatedPin);
          // Process icons to apply correct color
          setTimeout(() => processMarkerIcons(marker, updatedPin.color), 0);
        }

        new Notice(`Pin "${updatedPin.name}" updated`);
      } catch (error) {
        console.error(LOG_PREFIX, 'Failed to update pin:', error);
        new Notice('Failed to update pin');
      }
    });

    modal.open();
  }

  /**
   * Delete a pin
   */
  private async deletePin(pin: Pin): Promise<void> {
    try {
      await this.plugin.pinManager.deletePin(this.currentFile!, pin.id);

      if (this.mapData?.pins) {
        this.mapData.pins = this.mapData.pins.filter((p) => p.id !== pin.id);
      }

      const marker = this.markers.get(pin.id);
      if (marker) {
        marker.remove();
        this.markers.delete(pin.id);
      }

      new Notice(`Pin "${pin.name}" deleted`);
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to delete pin:', error);
      new Notice('Failed to delete pin');
    }
  }

  /**
   * Create a new note from a pin and link them
   */
  private async createNoteFromPin(pin: Pin): Promise<void> {
    try {
      const settings = this.plugin.settings;
      
      // Sanitize the pin name for use as filename
      const sanitizedName = pin.name.replace(/[\\/:*?"<>|]/g, '-');
      
      // Build the note path
      // Priority: 1) Settings folder, 2) Same folder as map file, 3) Vault root
      let folderPath = settings.defaultNoteFolder;
      
      if (!folderPath && this.currentFile?.parent) {
        // Use the same folder as the current map file
        folderPath = this.currentFile.parent.path;
      }
      
      let notePath = sanitizedName + '.md';
      if (folderPath && folderPath !== '/') {
        // Ensure folder exists
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          await this.app.vault.createFolder(folderPath);
        }
        notePath = `${folderPath}/${sanitizedName}.md`;
      }

      // Check if file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(notePath);
      if (existingFile) {
        new Notice(`Note "${sanitizedName}" already exists. Link it manually via Edit.`);
        return;
      }

      // Get template content if configured
      let content = `# ${pin.name}\n\n`;
      if (settings.noteTemplate) {
        const templateFile = this.app.vault.getAbstractFileByPath(settings.noteTemplate);
        if (templateFile instanceof TFile) {
          const templateContent = await this.app.vault.read(templateFile);
          // Replace template variables
          content = templateContent
            .replace(/\{\{name\}\}/g, pin.name)
            .replace(/\{\{title\}\}/g, pin.name)
            .replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
        }
      }

      // Create the note
      const newFile = await this.app.vault.create(notePath, content);

      // Update the pin with the link
      const updatedPin: Pin = {
        ...pin,
        link: `[[${newFile.basename}]]`,
      };

      await this.plugin.pinManager.updatePin(this.currentFile!, updatedPin);

      // Update local map data
      if (this.mapData?.pins) {
        const index = this.mapData.pins.findIndex((p) => p.id === pin.id);
        if (index !== -1) {
          this.mapData.pins[index] = updatedPin;
        }
      }

      new Notice(`Note "${newFile.basename}" created and linked`);

      // Open the new note in a new leaf
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.openFile(newFile);

    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to create note from pin:', error);
      new Notice('Failed to create note');
    }
  }

  // =============================================
  // Label Methods
  // =============================================

  /**
   * Load and display all labels from map data
   */
  private loadLabels(): void {
    if (!this.map || !this.mapData) return;

    // Create labels layer (separate from pins, no clustering)
    if (this.labelsLayer) {
      this.labelsLayer.remove();
    }
    this.labelsLayer = L.layerGroup().addTo(this.map);
    this.labelMarkers.clear();

    const labels = this.mapData.labels ?? [];
    console.log(LOG_PREFIX, 'Loading', labels.length, 'labels');

    for (const label of labels) {
      this.addLabelMarker(label);
    }
  }

  /**
   * Add a single label marker to the map
   */
  private addLabelMarker(label: Label): void {
    if (!this.labelsLayer) return;

    const marker = createLabelMarker(label, this.imageHeight, {
      draggable: !this.pinsLocked,
      onDragEnd: (l, newX, newY) => this.handleLabelDragEnd(l, newX, newY),
      onContextMenu: (l, event) => this.handleLabelContextMenu(l, event),
      onDblClick: (l) => this.editLabel(l),
    });

    marker.addTo(this.labelsLayer);
    this.labelMarkers.set(label.id, marker);
  }

  /**
   * Create a new label at the specified coordinates
   */
  private createNewLabel(x: number, y: number): void {
    const modal = new CreateLabelModal(this.app, { x, y }, async (labelData) => {
      try {
        const newLabel = await this.plugin.labelManager.createLabel(this.currentFile!, labelData);

        if (!this.mapData!.labels) {
          this.mapData!.labels = [];
        }
        this.mapData!.labels.push(newLabel);

        this.addLabelMarker(newLabel);

        new Notice(`Label "${newLabel.text}" created`);
      } catch (error) {
        console.error(LOG_PREFIX, 'Failed to create label:', error);
        new Notice('Failed to create label');
      }
    });

    modal.open();
  }

  /**
   * Edit an existing label
   */
  private editLabel(label: Label): void {
    // Get fresh label data
    const currentLabel = this.mapData?.labels?.find((l) => l.id === label.id) ?? label;

    const modal = new EditLabelModal(this.app, currentLabel, async (updatedLabel) => {
      try {
        await this.plugin.labelManager.updateLabel(this.currentFile!, updatedLabel);

        // Update local map data
        if (this.mapData?.labels) {
          const index = this.mapData.labels.findIndex((l) => l.id === label.id);
          if (index !== -1) {
            this.mapData.labels[index] = updatedLabel;
          }
        }

        // Update marker on map
        const marker = this.labelMarkers.get(label.id);
        if (marker) {
          updateLabelMarkerIcon(marker, updatedLabel);
        }

        new Notice(`Label "${updatedLabel.text}" updated`);
      } catch (error) {
        console.error(LOG_PREFIX, 'Failed to update label:', error);
        new Notice('Failed to update label');
      }
    });

    modal.open();
  }

  /**
   * Delete a label
   */
  private async deleteLabel(label: Label): Promise<void> {
    try {
      await this.plugin.labelManager.deleteLabel(this.currentFile!, label.id);

      if (this.mapData?.labels) {
        this.mapData.labels = this.mapData.labels.filter((l) => l.id !== label.id);
      }

      const marker = this.labelMarkers.get(label.id);
      if (marker) {
        marker.remove();
        this.labelMarkers.delete(label.id);
      }

      new Notice(`Label "${label.text}" deleted`);
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to delete label:', error);
      new Notice('Failed to delete label');
    }
  }

  /**
   * Handle right-click on a label
   */
  private handleLabelContextMenu(label: Label, event: L.LeafletMouseEvent): void {
    const currentLabel = this.mapData?.labels?.find((l) => l.id === label.id) ?? label;

    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle('Edit label')
        .setIcon('pencil')
        .onClick(() => this.editLabel(currentLabel))
    );

    menu.addItem((item) =>
      item
        .setTitle('Delete label')
        .setIcon('trash')
        .onClick(() => this.deleteLabel(currentLabel))
    );

    menu.showAtMouseEvent(event.originalEvent);
  }

  /**
   * Handle label drag end
   */
  private async handleLabelDragEnd(label: Label, newX: number, newY: number): Promise<void> {
    try {
      const updatedLabel: Label = { ...label, x: newX, y: newY };
      await this.plugin.labelManager.updateLabel(this.currentFile!, updatedLabel);

      const existingLabel = this.mapData?.labels?.find((l) => l.id === label.id);
      if (existingLabel) {
        existingLabel.x = newX;
        existingLabel.y = newY;
      }
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to update label position:', error);
      new Notice('Failed to save label position');

      const marker = this.labelMarkers.get(label.id);
      if (marker) {
        const { imageToLatLng } = await import('./utils/coordinates');
        marker.setLatLng(imageToLatLng(label.x, label.y, this.imageHeight));
      }
    }
  }

  /**
   * Toggle labels visibility
   */
  private toggleLabelsVisibility(): void {
    this.labelsVisible = !this.labelsVisible;

    if (this.labelsLayer && this.map) {
      if (this.labelsVisible) {
        this.labelsLayer.addTo(this.map);
      } else {
        this.labelsLayer.remove();
      }
    }
  }

  /**
   * Set the view state (used when opening the view)
   */
  async setState(state: { file?: string }, result: { history: boolean }): Promise<void> {
    console.log(LOG_PREFIX, 'setState called with:', state);
    
    if (state.file) {
      await this.loadFile(state.file);
    }
    
    await super.setState(state, result);
  }

  /**
   * Get the view state for persistence
   */
  getState(): { file?: string } {
    return {
      file: this.currentFile?.path,
    };
  }
}
