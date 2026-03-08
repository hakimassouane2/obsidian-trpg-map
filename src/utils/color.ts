/**
 * Color utility functions
 */

/**
 * Calculate the relative luminance of a color
 * Based on WCAG 2.0 formula
 * 
 * @param hex - Hex color string (with or without #)
 * @returns Luminance value between 0 (black) and 1 (white)
 */
export function getLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Determine if text/icon should be light or dark based on background color
 * 
 * @param backgroundColor - Hex color of the background
 * @returns 'light' for white/light icons, 'dark' for black/dark icons
 */
export function getContrastingTextColor(backgroundColor: string): 'light' | 'dark' {
  const luminance = getLuminance(backgroundColor);
  // Use 0.5 as threshold (middle ground)
  // Colors with luminance > 0.5 are considered "light" backgrounds
  return luminance > 0.5 ? 'dark' : 'light';
}

/**
 * Get the actual color value for icons based on background
 * 
 * @param backgroundColor - Hex color of the background
 * @returns '#000000' for dark icons, '#FFFFFF' for light icons
 */
export function getIconColor(backgroundColor: string): string {
  return getContrastingTextColor(backgroundColor) === 'dark' ? '#000000' : '#FFFFFF';
}
