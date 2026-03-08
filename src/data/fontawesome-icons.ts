/**
 * Font Awesome icons for the icon picker
 * Uses the official @fortawesome/free-solid-svg-icons package
 * All icons here are available in Font Awesome Free Solid
 */

export interface IconCategory {
  name: string;
  icons: string[];
}

/**
 * Curated icons organized by category for RPG maps
 * All these icons are available in Font Awesome Free Solid
 */
export const ICON_CATEGORIES: IconCategory[] = [
  {
    name: 'Buildings',
    icons: [
      'house', 'house-chimney', 'building', 'city', 'landmark',
      'church', 'warehouse', 'store', 'dungeon', 'fort',
      'monument', 'gopuram', 'place-of-worship', 'synagogue', 'mosque',
      'torii-gate', 'vihara', 'hotel', 'hospital', 'school',
      'industry', 'tower-observation', 'archway'
    ]
  },
  {
    name: 'Nature',
    icons: [
      'tree', 'mountain', 'mountain-sun', 'water', 'fire', 'snowflake',
      'sun', 'moon', 'star', 'cloud', 'bolt', 'dragon',
      'leaf', 'seedling', 'clover', 'hurricane', 'tornado', 'wind',
      'cloud-rain', 'cloud-sun', 'rainbow', 'meteor', 'volcano',
      'icicles', 'temperature-high', 'temperature-low'
    ]
  },
  {
    name: 'Combat & Weapons',
    icons: [
      'shield', 'shield-halved', 'skull', 'skull-crossbones',
      'crosshairs', 'bomb', 'explosion', 'burst',
      'gun', 'wand-sparkles', 'hand-fist', 'khanda',
      'person-rifle', 'jet-fighter', 'helicopter'
    ]
  },
  {
    name: 'Magic & Fantasy',
    icons: [
      'wand-magic-sparkles', 'hat-wizard', 'dragon', 'ghost',
      'book-skull', 'scroll', 'fire-flame-curved', 'hand-sparkles',
      'eye', 'eye-slash', 'moon', 'sun', 'star', 'sparkles',
      'crystal-ball', 'cauldron'
    ]
  },
  {
    name: 'Treasures & Items',
    icons: [
      'gem', 'coins', 'crown', 'scroll', 'book', 'map', 'compass',
      'key', 'lock', 'lock-open', 'ring', 'sack-dollar', 'money-bill',
      'trophy', 'medal', 'award', 'gift', 'box', 'chest'
    ]
  },
  {
    name: 'People & Creatures',
    icons: [
      'user', 'users', 'person', 'people-group', 'skull', 'ghost',
      'dragon', 'horse', 'horse-head', 'crow', 'dove', 'fish',
      'spider', 'bug', 'worm', 'otter', 'hippo', 'dog', 'cat',
      'kiwi-bird', 'frog', 'locust'
    ]
  },
  {
    name: 'Food & Drink',
    icons: [
      'utensils', 'wine-glass', 'beer-mug-empty', 'mug-hot',
      'martini-glass', 'whiskey-glass', 'bottle-water', 'wine-bottle',
      'bread-slice', 'cheese', 'drumstick-bite', 'fish', 'apple-whole',
      'carrot', 'lemon', 'pizza-slice', 'burger', 'hotdog', 'ice-cream',
      'cookie', 'cake-candles'
    ]
  },
  {
    name: 'Transport',
    icons: [
      'ship', 'anchor', 'sailboat', 'ferry', 'horse', 'carriage',
      'car', 'truck', 'bus', 'train', 'plane', 'helicopter',
      'bicycle', 'motorcycle', 'rocket', 'shuttle-space'
    ]
  },
  {
    name: 'Markers & Symbols',
    icons: [
      'location-dot', 'map-pin', 'thumbtack', 'flag', 'bookmark',
      'circle', 'square', 'diamond', 'heart', 'star',
      'circle-exclamation', 'circle-question', 'circle-info', 'circle-check',
      'triangle-exclamation', 'xmark', 'check', 'plus', 'minus',
      'arrows-up-down-left-right', 'up-down-left-right'
    ]
  },
  {
    name: 'Activities',
    icons: [
      'music', 'dice-d20', 'dice', 'chess', 'gamepad',
      'campground', 'tent', 'fire', 'person-hiking', 'person-swimming',
      'person-biking', 'person-running', 'futbol', 'baseball',
      'golf-ball-tee', 'bowling-ball', 'table-tennis-paddle-ball'
    ]
  },
  {
    name: 'Tools & Work',
    icons: [
      'hammer', 'wrench', 'screwdriver', 'gavel', 'axe',
      'pickaxe', 'shovel', 'toolbox', 'scissors', 'pen',
      'pencil', 'brush', 'paintbrush', 'palette', 'ruler',
      'compass-drafting', 'flask', 'microscope', 'vial'
    ]
  },
  {
    name: 'Communication',
    icons: [
      'bell', 'envelope', 'comment', 'comments', 'message',
      'phone', 'bullhorn', 'tower-broadcast', 'satellite-dish',
      'signal', 'wifi', 'rss'
    ]
  },
  {
    name: 'Religion & Mystical',
    icons: [
      'cross', 'ankh', 'om', 'yin-yang', 'peace', 'infinity',
      'star-of-david', 'menorah', 'hamsa', 'dharmachakra',
      'book-bible', 'book-quran', 'hands-praying', 'pray',
      'place-of-worship', 'church', 'mosque', 'synagogue'
    ]
  },
  {
    name: 'Weather & Time',
    icons: [
      'sun', 'moon', 'cloud', 'cloud-sun', 'cloud-moon',
      'cloud-rain', 'cloud-showers-heavy', 'cloud-bolt', 'snowflake',
      'wind', 'temperature-half', 'hourglass', 'hourglass-half',
      'clock', 'stopwatch', 'calendar', 'calendar-days'
    ]
  },
  {
    name: 'Medical & Health',
    icons: [
      'heart', 'heart-pulse', 'hospital', 'kit-medical', 'suitcase-medical',
      'pills', 'capsules', 'syringe', 'vial', 'prescription-bottle',
      'bandage', 'crutch', 'wheelchair', 'bed', 'staff-snake'
    ]
  }
];

/**
 * Get all icons as a flat array
 */
export function getAllIcons(): string[] {
  return ICON_CATEGORIES.flatMap(cat => cat.icons);
}

/**
 * Search icons by name (searches curated icons only)
 */
export function searchIcons(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return getAllIcons().filter(icon => icon.includes(lowerQuery));
}

/**
 * Search all FA icons by name
 */
export function searchAllIcons(query: string): string[] {
  const { getAllIconNames } = require('../data/fontawesome-svg');
  const lowerQuery = query.toLowerCase();
  return (getAllIconNames() as string[]).filter(icon => icon.includes(lowerQuery));
}

/**
 * Common emojis for RPG maps
 */
export const EMOJI_CATEGORIES: IconCategory[] = [
  {
    name: 'Places',
    icons: [
      '🏰', '🏯', '⛪', '🕌', '🕍', '⛩️', '🏛️', '🏠', '🏡', '🏢',
      '🏨', '🏪', '🏫', '🏥', '🏦', '🗼', '🗽', '⛲', '🎪', '🎠'
    ]
  },
  {
    name: 'Nature',
    icons: [
      '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '🍀', '🌺', '🌸', '🌻',
      '⛰️', '🏔️', '🌋', '🏝️', '🏖️', '🌊', '💧', '🔥', '❄️', '⭐'
    ]
  },
  {
    name: 'Creatures',
    icons: [
      '🐉', '🦄', '👻', '💀', '👹', '👺', '🧙', '🧝', '🧛', '🧟',
      '🐺', '🦅', '🦇', '🐍', '🦂', '🕷️', '🐗', '🦌', '🐻', '🦁'
    ]
  },
  {
    name: 'Items',
    icons: [
      '⚔️', '🗡️', '🛡️', '🏹', '💎', '👑', '💰', '🗝️', '🔮', '📜',
      '📖', '🗺️', '🧭', '⚗️', '🧪', '🎭', '🎲', '🃏', '🔔', '⚱️'
    ]
  },
  {
    name: 'Symbols',
    icons: [
      '❤️', '💔', '⚡', '✨', '💫', '🌙', '☀️', '⚓', '☠️', '⚰️',
      '🚩', '🏴', '🏳️', '❌', '⭕', '❓', '❗', '✅', '🔴', '🔵'
    ]
  }
];

/**
 * Get all emojis as a flat array
 */
export function getAllEmojis(): string[] {
  return EMOJI_CATEGORIES.flatMap(cat => cat.icons);
}

/**
 * Search emojis (by looking at the emoji itself)
 */
export function searchEmojis(query: string): string[] {
  // For emojis, we just return all if query is empty
  if (!query) return getAllEmojis();
  // Otherwise filter (though emojis don't really have searchable names here)
  return getAllEmojis();
}
