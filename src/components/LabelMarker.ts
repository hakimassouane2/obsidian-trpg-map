/**
 * Custom Leaflet marker for text labels
 *
 * Uses DOM construction (not innerHTML strings) to avoid
 * quote-escaping issues with font-family CSS values.
 */

import * as L from 'leaflet';
import type { Label } from '../types';
import { CSS_PREFIX, LABEL_FONT_SIZE_PX } from '../constants';
import { imageToLatLng } from '../utils/coordinates';

/** Font family CSS mapping */
const FONT_FAMILY_CSS: Record<string, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
};

/** Safe font-family for SVG attributes (no double quotes — uses single quotes) */
const FONT_FAMILY_SVG: Record<string, string> = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
};

/**
 * Create a Leaflet marker for a label
 */
export function createLabelMarker(
  label: Label,
  imageHeight: number,
  options?: {
    draggable?: boolean;
    onDragEnd?: (label: Label, newX: number, newY: number) => void;
    onContextMenu?: (label: Label, event: L.LeafletMouseEvent) => void;
    onDblClick?: (label: Label) => void;
  }
): L.Marker {
  const latlng = imageToLatLng(label.x, label.y, imageHeight);
  const fontSize = LABEL_FONT_SIZE_PX[label.fontSize];

  const el = buildLabelElement(label, fontSize);

  const icon = L.divIcon({
    className: `${CSS_PREFIX}label-marker`,
    html: el,
    iconSize: [0, 0],
    iconAnchor: [0, fontSize / 2],
  });

  const marker = L.marker(latlng, {
    icon,
    draggable: options?.draggable ?? false,
    interactive: true,
  });

  (marker as LabelMarkerType).labelData = label;

  if (options?.onContextMenu) {
    marker.on('contextmenu', (event: L.LeafletMouseEvent) => {
      options.onContextMenu!(label, event);
    });
  }

  if (options?.onDblClick) {
    marker.on('dblclick', () => {
      options.onDblClick!(label);
    });
  }

  if (options?.draggable && options?.onDragEnd) {
    marker.on('dragend', () => {
      const newLatLng = marker.getLatLng();
      const newX = Math.round(newLatLng.lng);
      const newY = Math.round(imageHeight - newLatLng.lat);
      options.onDragEnd!(label, newX, newY);
    });
  }

  return marker;
}

/**
 * Build the DOM element for a label.
 * Uses DOM API to set styles safely (no HTML string quote issues).
 */
function buildLabelElement(label: Label, fontSize: number): HTMLElement {
  const fontFamily = FONT_FAMILY_CSS[label.fontFamily] || FONT_FAMILY_CSS.sans;

  // If curve is non-zero, render as SVG with textPath
  if (label.curve !== 0) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildCurvedLabelSvg(label, fontSize);
    return wrapper;
  }

  const div = document.createElement('div');
  div.className = `${CSS_PREFIX}label-text`;
  div.textContent = label.text;
  div.dataset.labelId = label.id;

  // Apply all styles via DOM (safe from quote issues)
  div.style.fontFamily = fontFamily;
  div.style.fontSize = `${fontSize}px`;
  div.style.fontWeight = label.bold ? 'bold' : 'normal';
  div.style.fontStyle = label.italic ? 'italic' : 'normal';
  div.style.color = label.color;

  // Stroke
  if (label.strokeWidth > 0) {
    const sw = label.strokeWidth;
    div.style.webkitTextStroke = `${sw}px rgba(0,0,0,0.7)`;
    div.style.paintOrder = 'stroke fill';
    div.style.textShadow =
      `-${sw}px -${sw}px 0 rgba(0,0,0,0.5), ` +
      `${sw}px -${sw}px 0 rgba(0,0,0,0.5), ` +
      `-${sw}px ${sw}px 0 rgba(0,0,0,0.5), ` +
      `${sw}px ${sw}px 0 rgba(0,0,0,0.5)`;
  }

  // Rotation
  if (label.rotation) {
    div.style.transform = `rotate(${label.rotation}deg)`;
    div.style.transformOrigin = 'left center';
  }

  return div;
}

/**
 * Build curved text as SVG with textPath.
 * Uses single quotes in font-family to avoid breaking SVG attribute quotes.
 */
function buildCurvedLabelSvg(label: Label, fontSize: number): string {
  const fontFamily = FONT_FAMILY_SVG[label.fontFamily] || FONT_FAMILY_SVG.sans;
  const fontWeight = label.bold ? 'bold' : 'normal';
  const fontStyle = label.italic ? 'italic' : 'normal';
  const escapedText = escapeHtml(label.text);

  // Estimate text width
  const charWidth = fontSize * 0.6;
  const textWidth = escapedText.length * charWidth;
  const svgWidth = textWidth + 40;
  const svgHeight = fontSize * 3;

  // Curve: negative = curve up, positive = curve down
  const arcHeight = (label.curve / 100) * svgHeight;

  const startY = svgHeight / 2;
  const endX = svgWidth;
  const endY = svgHeight / 2;
  const controlX = svgWidth / 2;
  const controlY = svgHeight / 2 - arcHeight;

  const pathId = `curve-${label.id}`;
  const pathD = `M 0,${startY} Q ${controlX},${controlY} ${endX},${endY}`;

  // Stroke
  let strokeAttrs = '';
  if (label.strokeWidth > 0) {
    strokeAttrs = ` stroke="rgba(0,0,0,0.7)" stroke-width="${label.strokeWidth * 2}" paint-order="stroke fill"`;
  }

  // Rotation
  const rotateAttr = label.rotation
    ? ` transform="rotate(${label.rotation}, ${svgWidth / 2}, ${svgHeight / 2})"`
    : '';

  return `<svg width="${svgWidth}" height="${svgHeight}" class="${CSS_PREFIX}label-svg" style="overflow:visible;">` +
    `<defs><path id="${pathId}" d="${pathD}" /></defs>` +
    `<text${rotateAttr} font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" ` +
    `font-style="${fontStyle}" fill="${label.color}"${strokeAttrs}>` +
    `<textPath href="#${pathId}" startOffset="0">${escapedText}</textPath>` +
    `</text></svg>`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Extended marker type with label data
 */
export interface LabelMarkerType extends L.Marker {
  labelData: Label;
}

/**
 * Check if a marker is a LabelMarker
 */
export function isLabelMarker(marker: L.Marker): marker is LabelMarkerType {
  return 'labelData' in marker;
}

/**
 * Update a label marker's icon after data changes
 */
export function updateLabelMarkerIcon(marker: L.Marker, label: Label): void {
  const fontSize = LABEL_FONT_SIZE_PX[label.fontSize];
  const el = buildLabelElement(label, fontSize);

  const icon = L.divIcon({
    className: `${CSS_PREFIX}label-marker`,
    html: el,
    iconSize: [0, 0],
    iconAnchor: [0, fontSize / 2],
  });

  marker.setIcon(icon);

  if (isLabelMarker(marker)) {
    marker.labelData = label;
  }
}
