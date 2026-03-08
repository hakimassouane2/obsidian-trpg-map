/**
 * Font Awesome SVG generator using official @fortawesome packages
 * This uses the official Font Awesome npm packages for correct SVG paths
 */

import { icon, library, IconName } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Add all solid icons to the library
library.add(fas);

/**
 * Get SVG markup for a Font Awesome icon
 * Uses the official Font Awesome library for correct paths
 * 
 * @param iconName - The icon name (e.g., 'house', 'star', 'fire')
 * @param size - The height in pixels (width auto-calculated from aspect ratio)
 * @param color - The fill color
 * @returns SVG markup string
 */
export function getFontAwesomeSvg(iconName: string, size = 16, color = 'currentColor'): string {
  try {
    // Look up the icon in the library
    const iconLookup = icon({ prefix: 'fas', iconName: iconName as IconName });
    
    if (!iconLookup) {
      return getPlaceholderSvg(size, color);
    }
    
    // Get the icon data
    const [width, height, , , pathData] = iconLookup.icon;
    
    // Calculate display dimensions based on aspect ratio
    const aspectRatio = width / height;
    const displayHeight = size;
    const displayWidth = Math.round(size * aspectRatio);
    
    // Handle path data (can be string or array of strings)
    const pathString = Array.isArray(pathData) ? pathData.join(' ') : pathData;
    
    return `<svg width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${width} ${height}" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${pathString}"/></svg>`;
  } catch (e) {
    console.warn(`Font Awesome icon not found: ${iconName}`);
    return getPlaceholderSvg(size, color);
  }
}

/**
 * Get a placeholder SVG when icon is not found
 */
function getPlaceholderSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="${color}" xmlns="http://www.w3.org/2000/svg"><text x="256" y="380" font-size="400" text-anchor="middle">?</text></svg>`;
}

/**
 * Check if an icon exists in the Font Awesome library
 */
export function hasIcon(iconName: string): boolean {
  try {
    const iconLookup = icon({ prefix: 'fas', iconName: iconName as IconName });
    return iconLookup !== null && iconLookup !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get all available icon names from Font Awesome Free Solid
 * This returns the full list of ~1400 icons
 */
export function getAllIconNames(): string[] {
  return Object.keys(fas)
    .filter(key => key.startsWith('fa'))
    .map(key => {
      // Convert from faHouseFire to house-fire
      const name = key.slice(2); // Remove 'fa' prefix
      return name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .slice(1); // Remove leading dash
    });
}
