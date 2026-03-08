/**
 * SVG shape generators for pin markers
 * Shapes from LegendKeeper - exact SVG paths
 */

import type { PinShape, IconDisplayMode } from '../types';
import { getFAProIconHtml } from '../data/fontawesome-pro';
import { PIN_MARKER_CONFIG } from '../constants';

// Sizes from constants
const SIZE_LARGE = PIN_MARKER_CONFIG.SIZE;       // 48px - with icon
const SIZE_SMALL = PIN_MARKER_CONFIG.SIZE_SMALL; // 32px - without icon

/**
 * Per-shape viewBox overrides for visual size normalization.
 * Shapes like arch, banner, and marker occupy less of the default 48x48 viewBox,
 * so we zoom in slightly to make them visually consistent with larger shapes.
 */
const SHAPE_VIEW_CONFIG: Partial<Record<PinShape, string>> = {
  arch:   '4 0 40 48',
  banner: '3 0 42 48',
  marker: '4 0 40 48',
};

/**
 * Generate SVG markup for a pin shape
 *
 * @param shape - The pin shape type
 * @param color - Fill color (hex)
 * @param icon - Optional icon character or emoji
 * @param iconDisplay - Icon display mode: 'show', 'hide', or 'icon-only'
 * @returns SVG markup string
 */
export function getSvgForShape(
  shape: PinShape, 
  color: string, 
  icon?: string, 
  iconDisplay: IconDisplayMode = 'show'
): string {
  // Icon-only mode: just show the icon without shape
  if (iconDisplay === 'icon-only' && icon) {
    return wrapIconOnly(icon, color);
  }

  // Determine if we should show the icon and what size to use
  const showIcon = icon && iconDisplay !== 'hide';
  const isSmall = iconDisplay === 'hide';
  const size = isSmall ? SIZE_SMALL : SIZE_LARGE;
  const iconHtml = showIcon ? `<span class="trpg-pin-icon">${getIconHtml(icon)}</span>` : '';

  let svgContent = '';
  
  switch (shape) {
    case 'pin':
      svgContent = createPin(color);
      break;
    case 'circle':
      svgContent = createCircle(color);
      break;
    case 'diamond':
      svgContent = createDiamond(color);
      break;
    case 'arch':
      svgContent = createArch(color);
      break;
    case 'shield':
      svgContent = createShield(color);
      break;
    case 'flag':
      svgContent = createFlag(color);
      break;
    case 'banner':
      svgContent = createBanner(color);
      break;
    case 'marker':
      svgContent = createMarker(color);
      break;
    default:
      svgContent = createPin(color);
  }

  return wrapSvg(svgContent, iconHtml, shape, size);
}

/**
 * Wrap icon-only display (no shape background)
 */
function wrapIconOnly(icon: string, color: string): string {
  const iconHtml = getIconHtml(icon);
  return `
    <div class="trpg-pin-container trpg-icon-only" style="color: ${color};">
      <span class="trpg-pin-icon-standalone">${iconHtml}</span>
    </div>
  `;
}

/**
 * Pin shape (teardrop/location marker)
 */
function createPin(color: string): string {
  return `
    <path d="M36.027 7.951c-6.552-6.513-17.127-6.6-23.77-.277l-.267.26-.215.217c-6.352 6.523-6.36 16.86-.064 23.396l.262.267 12.026 11.955 11.937-11.865.31-.313c6.332-6.525 6.33-16.847.043-23.374l-.262-.266z" fill="${color}"/>
    <path d="M12.257 7.674c6.643-6.323 17.218-6.236 23.77.277l.262.266c6.288 6.527 6.29 16.849-.042 23.374l-.311.313L23.999 43.77 11.973 31.814l-.262-.267c-6.296-6.535-6.288-16.873.064-23.396l.215-.217zm2.119 2.125l-.254.245-.198.2a13.798 13.798 0 00-.081 19.192l.245.25 9.911 9.853 9.808-9.75.287-.287a13.798 13.798 0 00.063-19.174l-.245-.25c-5.386-5.354-14.081-5.436-19.536-.28z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M38.142 5.823c7.724 7.679 7.81 20.074.258 27.858l-.336.337L24 48 9.858 33.941c-7.733-7.687-7.81-20.102-.232-27.883l.232-.235c7.81-7.764 20.474-7.764 28.284 0zm-2.115 2.128c-6.552-6.513-17.127-6.6-23.77-.277l-.267.26-.215.217c-6.352 6.523-6.36 16.86-.064 23.396l.262.267 12.026 11.955 11.937-11.865.31-.313c6.332-6.525 6.33-16.847.043-23.374l-.262-.266z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Circle shape
 */
function createCircle(color: string): string {
  return `
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="${color}"/>
    <path d="M24 1c12.703 0 23 10.297 23 23S36.703 47 24 47 1 36.703 1 24 11.297 1 24 1zm0 6C14.611 7 7 14.611 7 24s7.611 17 17 17 17-7.611 17-17S33.389 7 24 7z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M24 1c12.703 0 23 10.297 23 23S36.703 47 24 47 1 36.703 1 24 11.297 1 24 1zm0 3C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Diamond shape
 */
function createDiamond(color: string): string {
  return `
    <path fill="${color}" d="M24 4.243L4.243 24 24 43.757 43.757 24z"/>
    <path d="M24 4.243L43.757 24 24 43.757 4.243 24 24 4.243zm0 4.242L8.485 24 24 39.515 39.515 24 24 8.485z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M24 0l24 24-24 24L0 24 24 0zm0 4.243L4.243 24 24 43.757 43.757 24 24 4.243z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Arch shape (rounded top, flat bottom)
 */
function createArch(color: string): string {
  return `
    <path d="M24 5C15.82 5 9.17 11.547 9.003 19.686L9 20v23h30V20c0-8.18-6.547-14.83-14.686-14.997L24 5z" fill="${color}"/>
    <path d="M24 5l.314.003C32.454 5.17 39 11.821 39 20v23H9V20l.003-.314C9.17 11.546 15.821 5 24 5zm0 3c-6.525 0-11.834 5.209-11.996 11.695L12 20v20h24V20c0-6.525-5.209-11.834-11.695-11.996L24 8z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M24 2c9.941 0 18 8.059 18 18v26H6V20c0-9.941 8.059-18 18-18zm0 3C15.82 5 9.17 11.547 9.003 19.686L9 20v23h30V20c0-8.18-6.547-14.83-14.686-14.997L24 5z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Shield shape
 */
function createShield(color: string): string {
  return `
    <path d="M24 3.17L6 9.342V24c0 5.08 3.307 10.102 9 14.754l.374.303c2.165 1.732 4.5 3.28 6.833 4.613.544.311 1.061.595 1.545.85l.251.131.177-.093c.488-.257 1.041-.56 1.648-.908l.308-.177c2.34-1.36 4.654-2.92 6.785-4.654 5.623-4.577 8.933-9.502 9.074-14.487L42 24V9.342L24 3.17z" fill="${color}"/>
    <path d="M24 3.17l18 6.172V24l-.005.332c-.141 4.985-3.45 9.91-9.074 14.487-2.13 1.735-4.445 3.295-6.785 4.654l-.308.177c-.607.348-1.16.651-1.648.908l-.177.093-.25-.13a53.276 53.276 0 01-1.546-.85c-2.334-1.335-4.668-2.882-6.833-4.614L15 38.754C9.307 34.102 6 29.08 6 24V9.342L24 3.17zm0 3.172L9 11.485V24c0 3.989 2.834 8.29 7.892 12.426l.356.289a49.82 49.82 0 005.712 3.923l.736.428.304.172.63-.36c2.212-1.284 4.399-2.759 6.397-4.385 5-4.07 7.839-8.287 7.968-12.213L39 24V11.485L24 6.342z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M24 0l21 7.2V24c0 12.842-16.701 21.866-20.316 23.669L24 48l-.48-.23C20.424 46.25 3.38 37.304 3.006 24.43L3 24V7.2L24 0zm0 3.17L6 9.342V24c0 5.08 3.307 10.102 9 14.754l.374.303c2.165 1.732 4.5 3.28 6.833 4.613.544.311 1.061.595 1.545.85l.251.131.177-.093c.488-.257 1.041-.56 1.648-.908l.308-.177c2.34-1.36 4.654-2.92 6.785-4.654 5.623-4.577 8.933-9.502 9.074-14.487L42 24V9.342L24 3.17z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Flag shape (wavy sides)
 */
function createFlag(color: string): string {
  return `
    <path d="M22.171 4.7c-4.428-1.433-6.573-1.851-9.48-1.666-3.123.2-5.584.75-7.46 1.523-.385.159-.727.32-1.029.479L4 5.145v31.176l.389-.132c2.069-.685 4.498-1.165 7.311-1.386l.609-.043c3.97-.253 6.723.313 12.12 2.08l1.4.46c4.428 1.433 6.573 1.851 9.48 1.666 3.123-.2 5.584-.75 7.46-1.523.385-.159.727-.32 1.029-.479l.202-.111V5.676l-.245.087c-2.1.71-4.572 1.207-7.443 1.433l-.62.044c-3.846.245-6.55-.279-11.622-1.918l-1.899-.621z" fill="${color}"/>
    <path d="M12.691 3.034c2.907-.185 5.052.233 9.48 1.667l1.899.621c5.072 1.64 7.776 2.163 11.621 1.918l.621-.044c2.87-.226 5.344-.723 7.443-1.433L44 5.676v31.177l-.202.111c-.302.16-.644.32-1.03.48-1.875.772-4.336 1.323-7.46 1.522-2.906.185-5.05-.233-9.48-1.667l-1.4-.46c-5.396-1.766-8.15-2.332-12.12-2.079l-.608.043c-2.813.22-5.242.7-7.311 1.386L4 36.32V5.145l.202-.11c.302-.159.644-.32 1.03-.478 1.875-.773 4.336-1.324 7.46-1.523zm.191 2.994c-2.308.147-4.167.498-5.625.977L7 7.092v25.311l.357-.067c1.31-.239 2.725-.42 4.249-.534l.512-.036c4.453-.284 7.49.34 13.221 2.215l1.76.576c3.837 1.229 5.66 1.566 8.019 1.415 2.308-.147 4.167-.498 5.625-.977l.257-.088V9.583l-.307.061a38.932 38.932 0 01-4.171.545l-.64.045c-4.314.275-7.298-.302-12.692-2.043l-2.289-.748c-3.837-1.229-5.66-1.566-8.019-1.415z" fill="#FFF" fill-rule="nonzero"/>
    <path d="M1 3.61l.118-.11C1.736 2.95 4.865.527 12.5.04c8.625-.55 14.375 4.756 23 4.206l.83-.062c7.034-.602 9.957-2.868 10.552-3.398L47 .676v37.713l-.118.111c-.618.55-3.747 2.973-11.382 3.46-8.625.55-14.375-4.756-23-4.206l-.83.062c-3.503.3-5.986 1.012-7.67 1.718V48H1V3.61zm11.691-.576c-3.123.2-5.584.75-7.46 1.523-.385.159-.727.32-1.029.479L4 5.145v31.176l.389-.132c2.069-.685 4.498-1.165 7.311-1.386l.609-.043c3.97-.253 6.723.313 12.12 2.08l1.4.46c4.428 1.433 6.573 1.851 9.48 1.666 3.123-.2 5.584-.75 7.46-1.523.385-.159.727-.32 1.029-.479l.202-.111V5.676l-.245.087c-2.1.71-4.572 1.207-7.443 1.433l-.62.044c-3.846.245-6.55-.279-11.622-1.918l-1.899-.621c-4.428-1.434-6.573-1.852-9.48-1.667z" fill="#000" fill-rule="nonzero"/>
  `;
}

/**
 * Banner shape (rectangle with V notch at bottom)
 */
function createBanner(color: string): string {
  return `
    <path d="M24 35.2127L38.9434 40.3377V6H9.0566V40.3377L24 35.2127Z" fill="${color}"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M38.9434 40.3377L24 35.2127L9.0566 40.3377V6H38.9434V40.3377ZM35.8868 36.0087L24 32.0087L12.1132 36.0087V9H35.8868V36.0087Z" fill="#FFF"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M24 35.2127L38.9434 40.3377V6H9.0566V40.3377L24 35.2127ZM6 44.6667V3H42V44.6667L24 38.4167L6 44.6667Z" fill="#000"/>
  `;
}

/**
 * Marker shape (pentagon with pointed bottom)
 */
function createMarker(color: string): string {
  return `
    <path fill-rule="evenodd" clip-rule="evenodd" d="M38.9143 5V37.0379L24 44.5652L9.08571 37.0379V5H38.9143Z" fill="${color}"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M38.9143 5V37.0379L24 44.5652L9.08571 37.0379V5H38.9143ZM35.8286 8V35.2758L24 41.1304L12.1714 35.2758V8H35.8286Z" fill="#FFF"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M38.9143 37.0379V5H9.08571V37.0379L24 44.5652L38.9143 37.0379ZM24 48L42 38.8V2H6V38.8L24 48Z" fill="#000"/>
  `;
}

/**
 * Wrap SVG content in the full SVG element
 * @param shapeSvg - The SVG path content
 * @param iconHtml - HTML for the icon overlay
 * @param shape - The pin shape name (used for per-shape CSS class and viewBox)
 * @param size - The size of the pin (default SIZE_LARGE for backward compat)
 */
function wrapSvg(shapeSvg: string, iconHtml: string, shape: PinShape, size: number = SIZE_LARGE): string {
  const isSmall = size === SIZE_SMALL;
  const sizeClass = isSmall ? ' trpg-pin-small' : '';
  const viewBox = SHAPE_VIEW_CONFIG[shape] ?? '0 0 48 48';

  return `
    <div class="trpg-pin-container trpg-shape-${shape}${sizeClass}">
      <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
          <path fill="none" d="M0 0h48v48H0z"/>
          ${shapeSvg}
        </g>
      </svg>
      ${iconHtml}
    </div>
  `;
}

/**
 * Get HTML for an icon (Font Awesome Pro or emoji)
 * Format: "fa:icon-name" for Font Awesome, or just the emoji character
 */
function getIconHtml(icon: string): string {
  if (icon.startsWith('fa:')) {
    // Font Awesome Pro icon via CSS webfont
    const iconName = icon.substring(3);
    return `<span class="trpg-fa-icon">${getFAProIconHtml(iconName)}</span>`;
  }
  // Emoji or legacy Lucide icon
  if (isEmoji(icon)) {
    return `<span class="trpg-emoji-icon">${icon}</span>`;
  }
  // Legacy support for old Lucide icons - just show as text
  return `<span class="trpg-text-icon">${icon}</span>`;
}

/**
 * Check if a string is an emoji
 */
function isEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiRegex.test(str);
}

/**
 * Get all available shape names
 */
export function getShapeNames(): PinShape[] {
  return ['pin', 'circle', 'diamond', 'arch', 'shield', 'flag', 'banner', 'marker'];
}

/**
 * Get the size of shapes (large size with icon)
 */
export function getShapeSize(): number {
  return SIZE_LARGE;
}

/**
 * Get the small size of shapes (without icon)
 */
export function getShapeSizeSmall(): number {
  return SIZE_SMALL;
}

/**
 * Get pin size configuration based on icon display mode
 * @param iconDisplay - The icon display mode
 * @param hasIcon - Whether the pin has an icon defined
 * @returns Object with size, anchorX, anchorY
 */
export function getPinSizeConfig(iconDisplay: IconDisplayMode = 'show', hasIcon = false): { size: number; anchorX: number; anchorY: number } {
  // Use small size when hiding icon or when there's no icon at all (and not icon-only mode)
  const useSmall = iconDisplay === 'hide' || (!hasIcon && iconDisplay !== 'icon-only');
  
  if (useSmall) {
    return {
      size: SIZE_SMALL,
      anchorX: PIN_MARKER_CONFIG.ANCHOR_X_SMALL,
      anchorY: PIN_MARKER_CONFIG.ANCHOR_Y_SMALL,
    };
  }
  
  return {
    size: SIZE_LARGE,
    anchorX: PIN_MARKER_CONFIG.ANCHOR_X,
    anchorY: PIN_MARKER_CONFIG.ANCHOR_Y,
  };
}

/**
 * Get a preview SVG for shape selection UI
 */
export function getShapePreview(shape: PinShape, color: string, size = 24): string {
  const scale = size / SIZE_LARGE;
  return `
    <div style="transform: scale(${scale}); transform-origin: top left; width: ${size}px; height: ${size}px;">
      ${getSvgForShape(shape, color)}
    </div>
  `;
}
