/**
 * Custom Leaflet marker for pins
 */

import * as L from 'leaflet';
import type { Pin } from '../types';
import { CSS_PREFIX } from '../constants';
import { getSvgForShape, getPinSizeConfig } from './shapes';
import { imageToLatLng } from '../utils/coordinates';
import { getIconColor } from '../utils/color';

/**
 * Create a Leaflet marker for a pin
 *
 * @param pin - The pin data
 * @param imageHeight - Height of the map image (for coordinate conversion)
 * @param options - Additional marker options
 * @returns Leaflet marker with custom icon
 */
export function createPinMarker(
  pin: Pin,
  imageHeight: number,
  options?: {
    draggable?: boolean;
    onDragStart?: (pin: Pin) => void;
    onDragEnd?: (pin: Pin, newX: number, newY: number) => void;
    onClick?: (pin: Pin) => void;
    onContextMenu?: (pin: Pin, event: L.LeafletMouseEvent) => void;
    onMouseOver?: (pin: Pin, event: L.LeafletMouseEvent) => void;
    onMouseOut?: (pin: Pin) => void;
  }
): L.Marker {
  const latlng = imageToLatLng(pin.x, pin.y, imageHeight);
  
  // Get the appropriate size based on icon display mode
  const sizeConfig = getPinSizeConfig(pin.iconDisplay, !!pin.icon);

  const icon = L.divIcon({
    className: `${CSS_PREFIX}pin-marker`,
    html: getSvgForShape(pin.shape, pin.color, pin.icon, pin.iconDisplay),
    iconSize: [sizeConfig.size, sizeConfig.size],
    iconAnchor: [sizeConfig.anchorX, sizeConfig.anchorY],
  });

  const marker = L.marker(latlng, {
    icon,
    draggable: options?.draggable ?? false,
    // Note: Don't use 'title' here - it creates a native HTML tooltip
    // We use Leaflet's bindTooltip() instead for better styling
  });

  // Store pin data on the marker for later retrieval
  (marker as PinMarker).pinData = pin;

  // Set up event handlers
  if (options?.onClick) {
    marker.on('click', () => {
      options.onClick!(pin);
    });
  }

  if (options?.onContextMenu) {
    marker.on('contextmenu', (event: L.LeafletMouseEvent) => {
      options.onContextMenu!(pin, event);
    });
  }

  if (options?.draggable) {
    if (options?.onDragStart) {
      marker.on('dragstart', () => {
        options.onDragStart!(pin);
      });
    }
    if (options?.onDragEnd) {
      marker.on('dragend', () => {
        const newLatLng = marker.getLatLng();
        const newX = Math.round(newLatLng.lng);
        const newY = Math.round(imageHeight - newLatLng.lat);
        options.onDragEnd!(pin, newX, newY);
      });
    }
  }

  // Hover events for page preview
  if (options?.onMouseOver) {
    marker.on('mouseover', (event: L.LeafletMouseEvent) => {
      options.onMouseOver!(pin, event);
    });
  }

  if (options?.onMouseOut) {
    marker.on('mouseout', () => {
      options.onMouseOut!(pin);
    });
  }

  // Add tooltip
  marker.bindTooltip(pin.name, {
    direction: 'top',
    offset: [0, -sizeConfig.anchorY],
    className: `${CSS_PREFIX}pin-tooltip`,
  });

  return marker;
}

/**
 * Extended marker type with pin data
 */
export interface PinMarker extends L.Marker {
  pinData: Pin;
}

/**
 * Check if a marker is a PinMarker
 */
export function isPinMarker(marker: L.Marker): marker is PinMarker {
  return 'pinData' in marker;
}

/**
 * Update a marker's icon after pin data changes
 *
 * @param marker - The marker to update
 * @param pin - Updated pin data
 */
export function updateMarkerIcon(marker: L.Marker, pin: Pin): void {
  // Get the appropriate size based on icon display mode
  const sizeConfig = getPinSizeConfig(pin.iconDisplay, !!pin.icon);
  
  const icon = L.divIcon({
    className: `${CSS_PREFIX}pin-marker`,
    html: getSvgForShape(pin.shape, pin.color, pin.icon, pin.iconDisplay),
    iconSize: [sizeConfig.size, sizeConfig.size],
    iconAnchor: [sizeConfig.anchorX, sizeConfig.anchorY],
  });

  marker.setIcon(icon);

  // Update tooltip
  marker.setTooltipContent(pin.name);

  // Update stored pin data
  if (isPinMarker(marker)) {
    marker.pinData = pin;
  }

  // Process icons and apply correct color
  processMarkerIcons(marker, pin.color);
}

/**
 * Update a marker's position
 *
 * @param marker - The marker to update
 * @param x - New X coordinate (image pixels)
 * @param y - New Y coordinate (image pixels)
 * @param imageHeight - Height of the map image
 */
export function updateMarkerPosition(
  marker: L.Marker,
  x: number,
  y: number,
  imageHeight: number
): void {
  const latlng = imageToLatLng(x, y, imageHeight);
  marker.setLatLng(latlng);
}

/**
 * Process icons in a marker and apply correct color based on background
 *
 * @param marker - The marker containing icons
 * @param backgroundColor - The pin's background color
 */
export function processMarkerIcons(marker: L.Marker, backgroundColor?: string): void {
  const element = marker.getElement();
  if (!element) return;

  // Icon-only mode: the color IS the icon color (set inline), don't override it
  if (element.querySelector('.trpg-icon-only')) return;

  // Apply icon color based on background luminance
  if (backgroundColor) {
    const iconColor = getIconColor(backgroundColor);
    const iconElements = element.querySelectorAll('.trpg-pin-icon, .trpg-fa-icon, .trpg-emoji-icon');
    iconElements.forEach((el: Element) => {
      (el as HTMLElement).style.color = iconColor;
    });
  }
}

/**
 * Create all pin markers for a map
 *
 * @param pins - Array of pins
 * @param imageHeight - Height of the map image
 * @param options - Marker options
 * @returns Array of markers
 */
export function createPinMarkers(
  pins: Pin[],
  imageHeight: number,
  options?: {
    draggable?: boolean;
    onDragStart?: (pin: Pin) => void;
    onDragEnd?: (pin: Pin, newX: number, newY: number) => void;
    onClick?: (pin: Pin) => void;
    onContextMenu?: (pin: Pin, event: L.LeafletMouseEvent) => void;
    onMouseOver?: (pin: Pin, event: L.LeafletMouseEvent) => void;
    onMouseOut?: (pin: Pin) => void;
  }
): L.Marker[] {
  return pins.map((pin) => createPinMarker(pin, imageHeight, options));
}
