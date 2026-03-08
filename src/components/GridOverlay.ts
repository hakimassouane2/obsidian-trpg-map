/**
 * Grid Overlay - Displays a coordinate grid on the map
 * Supports square and hexagonal grids
 */

import * as L from 'leaflet';
import type { GridType } from '../types';

// Grid line style
const LINE_STYLE: L.PolylineOptions = {
  color: '#000000',
  weight: 1,
  opacity: 0.4,
  interactive: false,
};

/**
 * Create a square grid overlay
 */
function createSquareGrid(
  imageWidth: number,
  imageHeight: number,
  gridSize: number
): L.LayerGroup {
  const gridLayer = L.layerGroup();

  // Vertical lines
  for (let x = 0; x <= imageWidth; x += gridSize) {
    const line = L.polyline([[0, x], [imageHeight, x]], LINE_STYLE);
    gridLayer.addLayer(line);
  }

  // Horizontal lines
  for (let y = 0; y <= imageHeight; y += gridSize) {
    const line = L.polyline([[y, 0], [y, imageWidth]], LINE_STYLE);
    gridLayer.addLayer(line);
  }

  return gridLayer;
}

/**
 * Create a hexagonal grid overlay (flat-top / horizontal orientation)
 * Hexagons are arranged with flat sides on top and bottom
 */
function createHexGridHorizontal(
  imageWidth: number,
  imageHeight: number,
  hexSize: number
): L.LayerGroup {
  const gridLayer = L.layerGroup();

  // For flat-top hexagons:
  // width = 2 * size
  // height = sqrt(3) * size
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);
  
  // Horizontal distance between hex centers
  const horizSpacing = hexWidth * 0.75;
  // Vertical distance between hex centers
  const vertSpacing = hexHeight;

  const cols = Math.ceil(imageWidth / horizSpacing) + 2;
  const rows = Math.ceil(imageHeight / vertSpacing) + 2;

  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      // Offset every other column
      const xOffset = col * horizSpacing;
      const yOffset = row * vertSpacing + (col % 2 === 1 ? vertSpacing / 2 : 0);

      const hexPoints = getHexagonPointsHorizontal(xOffset, yOffset, hexSize);
      const polygon = L.polygon(hexPoints, { ...LINE_STYLE, fill: false });
      gridLayer.addLayer(polygon);
    }
  }

  return gridLayer;
}

/**
 * Create a hexagonal grid overlay (pointy-top / vertical orientation)
 * Hexagons are arranged with points on top and bottom
 */
function createHexGridVertical(
  imageWidth: number,
  imageHeight: number,
  hexSize: number
): L.LayerGroup {
  const gridLayer = L.layerGroup();

  // For pointy-top hexagons:
  // width = sqrt(3) * size
  // height = 2 * size
  const hexWidth = hexSize * Math.sqrt(3);
  const hexHeight = hexSize * 2;
  
  // Horizontal distance between hex centers
  const horizSpacing = hexWidth;
  // Vertical distance between hex centers
  const vertSpacing = hexHeight * 0.75;

  const cols = Math.ceil(imageWidth / horizSpacing) + 2;
  const rows = Math.ceil(imageHeight / vertSpacing) + 2;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      // Offset every other row
      const xOffset = col * horizSpacing + (row % 2 === 1 ? horizSpacing / 2 : 0);
      const yOffset = row * vertSpacing;

      const hexPoints = getHexagonPointsVertical(xOffset, yOffset, hexSize);
      const polygon = L.polygon(hexPoints, { ...LINE_STYLE, fill: false });
      gridLayer.addLayer(polygon);
    }
  }

  return gridLayer;
}

/**
 * Get the 6 corner points of a flat-top hexagon
 */
function getHexagonPointsHorizontal(
  centerX: number,
  centerY: number,
  size: number
): L.LatLngExpression[] {
  const points: L.LatLngExpression[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = centerX + size * Math.cos(angleRad);
    const y = centerY + size * Math.sin(angleRad);
    points.push([y, x]); // Leaflet uses [lat, lng] = [y, x]
  }
  
  return points;
}

/**
 * Get the 6 corner points of a pointy-top hexagon
 */
function getHexagonPointsVertical(
  centerX: number,
  centerY: number,
  size: number
): L.LatLngExpression[] {
  const points: L.LatLngExpression[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // Rotate 30 degrees for pointy-top
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = centerX + size * Math.cos(angleRad);
    const y = centerY + size * Math.sin(angleRad);
    points.push([y, x]); // Leaflet uses [lat, lng] = [y, x]
  }
  
  return points;
}

/**
 * Create a grid overlay layer for the map
 */
export function createGridOverlay(
  imageWidth: number,
  imageHeight: number,
  gridSize: number,
  gridType: GridType
): L.LayerGroup {
  console.log('[TRPG Maps] Creating grid:', { imageWidth, imageHeight, gridSize, gridType });

  switch (gridType) {
    case 'hex-horizontal':
      return createHexGridHorizontal(imageWidth, imageHeight, gridSize);
    case 'hex-vertical':
      return createHexGridVertical(imageWidth, imageHeight, gridSize);
    case 'square':
    default:
      return createSquareGrid(imageWidth, imageHeight, gridSize);
  }
}

/**
 * Grid overlay class with show/hide functionality
 */
export class GridOverlay {
  private layer: L.LayerGroup | null = null;
  private map: L.Map;
  private imageWidth: number;
  private imageHeight: number;
  private gridSize: number;
  private gridType: GridType;
  private visible: boolean;

  constructor(
    map: L.Map,
    imageWidth: number,
    imageHeight: number,
    gridSize: number,
    gridType: GridType,
    visible: boolean = false
  ) {
    this.map = map;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.gridSize = gridSize;
    this.gridType = gridType;
    this.visible = visible;

    if (visible) {
      this.show();
    }
  }

  /**
   * Show the grid overlay
   */
  show(): void {
    if (this.layer) {
      this.hide();
    }
    
    this.layer = createGridOverlay(this.imageWidth, this.imageHeight, this.gridSize, this.gridType);
    this.layer.addTo(this.map);
    this.visible = true;
  }

  /**
   * Hide the grid overlay
   */
  hide(): void {
    if (this.layer) {
      this.layer.remove();
      this.layer = null;
    }
    this.visible = false;
  }

  /**
   * Toggle grid visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if grid is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Update grid size and redraw if visible
   */
  setGridSize(size: number): void {
    this.gridSize = size;
    if (this.visible) {
      this.show();
    }
  }

  /**
   * Update grid type and redraw if visible
   */
  setGridType(type: GridType): void {
    this.gridType = type;
    if (this.visible) {
      this.show();
    }
  }

  /**
   * Clean up the grid layer
   */
  destroy(): void {
    this.hide();
  }
}
