/**
 * Coordinate conversion utilities for TRPG Maps
 *
 * Leaflet uses LatLng where:
 * - lat = vertical position (higher = up)
 * - lng = horizontal position (higher = right)
 *
 * Image pixels use:
 * - x = horizontal position (0 = left)
 * - y = vertical position (0 = top)
 *
 * With CRS.Simple, we map:
 * - lat = imageHeight - y (inverted Y axis)
 * - lng = x
 */

import * as L from 'leaflet';
import type { ImageCoords } from '../types';

/**
 * Convert image pixel coordinates to Leaflet LatLng
 *
 * @param x - X coordinate in image pixels (0 = left edge)
 * @param y - Y coordinate in image pixels (0 = top edge)
 * @param imageHeight - Total height of the image in pixels
 * @returns Leaflet LatLng object
 */
export function imageToLatLng(x: number, y: number, imageHeight: number): L.LatLng {
  // Invert Y axis: Leaflet's lat increases upward, image Y increases downward
  return L.latLng(imageHeight - y, x);
}

/**
 * Convert Leaflet LatLng to image pixel coordinates
 *
 * @param latlng - Leaflet LatLng object
 * @param imageHeight - Total height of the image in pixels
 * @returns Object with x and y in image pixel coordinates
 */
export function latLngToImage(latlng: L.LatLng, imageHeight: number): ImageCoords {
  return {
    x: Math.round(latlng.lng),
    y: Math.round(imageHeight - latlng.lat),
  };
}

/**
 * Calculate the bounds for an image overlay in Leaflet
 *
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @returns Leaflet LatLngBounds for the image
 */
export function getImageBounds(imageWidth: number, imageHeight: number): L.LatLngBounds {
  // Bottom-left corner: (0, 0) in lat/lng = (0, imageHeight) in image coords
  // Top-right corner: (imageHeight, imageWidth) in lat/lng = (imageWidth, 0) in image coords
  return L.latLngBounds([[0, 0], [imageHeight, imageWidth]]);
}

/**
 * Clamp coordinates to stay within image bounds
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param imageWidth - Image width
 * @param imageHeight - Image height
 * @returns Clamped coordinates
 */
export function clampToImage(
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number
): ImageCoords {
  return {
    x: Math.max(0, Math.min(imageWidth, Math.round(x))),
    y: Math.max(0, Math.min(imageHeight, Math.round(y))),
  };
}
