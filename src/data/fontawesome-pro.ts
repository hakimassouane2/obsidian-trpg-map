/**
 * Font Awesome Pro integration
 * Fetches CSS + fonts via JS and injects as inline <style> with blob URLs
 * to bypass Obsidian's Content Security Policy restrictions.
 */

const FA_PRO_VERSION = '6.7.2';
const FA_CSS_BASE = `https://site-assets.fontawesome.com/releases/v${FA_PRO_VERSION}/css`;
const FA_FONT_BASE = `https://site-assets.fontawesome.com/releases/v${FA_PRO_VERSION}/webfonts`;
const FA_CSS_URL = `${FA_CSS_BASE}/all.css`;

let styleElement: HTMLStyleElement | null = null;
let blobUrls: string[] = [];
let iconNamesCache: string[] | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Load Font Awesome Pro CSS + fonts.
 * Fetches the CSS, downloads referenced fonts as blobs,
 * replaces font URLs with blob URLs, and injects as inline <style>.
 */
export function loadFAProCSS(): Promise<void> {
  if (styleElement) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = doLoadFAProCSS();
  return loadPromise;
}

async function doLoadFAProCSS(): Promise<void> {
  try {
    // Fetch the main CSS
    const cssResponse = await fetch(FA_CSS_URL);
    let cssText = await cssResponse.text();

    // Parse icon names from CSS while we have it
    parseIconNamesFromCSS(cssText);

    // Find all font URLs (relative or absolute) and download as blobs
    // FA CSS uses relative paths like ../webfonts/fa-solid-900.woff2
    const fontUrlPattern = /url\(["']?([^"'\)]+\.woff2[^"'\)]*)["']?\)/g;
    const fontReplacements = new Map<string, string>();
    const fontUrls = new Set<string>();
    let match;

    while ((match = fontUrlPattern.exec(cssText)) !== null) {
      fontUrls.add(match[1]);
    }

    // Download fonts in parallel, convert to blob URLs
    await Promise.allSettled([...fontUrls].map(async (relativeUrl) => {
      const absoluteUrl = resolveUrl(relativeUrl);
      try {
        const resp = await fetch(absoluteUrl);
        if (!resp.ok) return;
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        fontReplacements.set(relativeUrl, blobUrl);
        blobUrls.push(blobUrl);
      } catch {
        // Font download failed - icon style won't render, that's OK
      }
    }));

    // Replace font URLs in CSS with blob URLs
    for (const [original, blobUrl] of fontReplacements) {
      cssText = cssText.split(original).join(blobUrl);
    }

    // Inject as inline <style> (CSP allows 'unsafe-inline')
    styleElement = document.createElement('style');
    styleElement.id = 'trpg-fontawesome-pro';
    styleElement.textContent = cssText;
    document.head.appendChild(styleElement);

    console.log(`[TRPG Maps] FA Pro loaded: ${iconNamesCache?.length ?? 0} icons, ${fontReplacements.size} fonts`);
  } catch (e) {
    console.warn('[TRPG Maps] Failed to load FA Pro:', e);
  }
}

/**
 * Resolve a relative font URL to absolute
 */
function resolveUrl(url: string): string {
  if (url.startsWith('http')) return url;
  // Relative paths like ../webfonts/fa-solid-900.woff2
  if (url.startsWith('../webfonts/')) {
    return `${FA_FONT_BASE}/${url.replace('../webfonts/', '')}`;
  }
  // Other relative paths
  return `${FA_CSS_BASE}/${url}`;
}

/**
 * Unload Font Awesome Pro CSS and clean up blob URLs
 */
export function unloadFAProCSS(): void {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  blobUrls.forEach((url) => URL.revokeObjectURL(url));
  blobUrls = [];
  iconNamesCache = null;
  loadPromise = null;
}

/**
 * Parse icon names from FA CSS content.
 * FA Pro v6+ uses CSS custom properties: .fa-house{--fa:"\f015"}
 */
function parseIconNamesFromCSS(cssText: string): void {
  // Match: .fa-ICONNAME{--fa:"
  const iconRegex = /\.fa-([\w-]+)\{--fa:/g;
  const names = new Set<string>();
  const EXCLUDE = new Set([
    'lg', 'xs', 'sm', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x',
    'fw', 'ul', 'li', 'border', 'pull-left', 'pull-right', 'spin', 'spin-reverse',
    'spin-pulse', 'pulse', 'rotate-90', 'rotate-180', 'rotate-270', 'rotate-by',
    'flip-horizontal', 'flip-vertical', 'flip-both', 'stack', 'stack-1x', 'stack-2x',
    'inverse', 'layers', 'layers-text', 'layers-counter', 'beat', 'beat-fade', 'bounce',
    'fade', 'flip', 'shake', 'swap-opacity', 'sr-only', 'sr-only-focusable',
    'brands', 'classic', 'duotone', 'light', 'regular', 'sharp', 'sharp-duotone',
    'solid', 'thin',
  ]);

  let match;
  while ((match = iconRegex.exec(cssText)) !== null) {
    const name = match[1];
    if (!EXCLUDE.has(name) && !name.match(/^\d+x$/)) {
      names.add(name);
    }
  }

  iconNamesCache = Array.from(names).sort();
}

/**
 * Get all available FA Pro icon names
 * Returns cached names (parsed during CSS load)
 */
export async function getAllFAProIconNames(): Promise<string[]> {
  // Wait for CSS load to complete (which also parses names)
  await loadFAProCSS();
  return iconNamesCache ?? [];
}

/**
 * Generate HTML for a Font Awesome Pro icon
 * @param iconName - Icon name without fa- prefix (e.g., 'house', 'tree')
 * @param style - FA style class (default: 'fa-solid')
 */
export function getFAProIconHtml(iconName: string, style = 'fa-solid'): string {
  return `<i class="${style} fa-${iconName}"></i>`;
}
