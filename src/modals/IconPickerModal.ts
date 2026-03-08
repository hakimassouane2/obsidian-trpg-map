/**
 * Icon Picker Modal - Simple grid with search and Glyphs/Emoji tabs
 * Uses Font Awesome Pro via CSS webfont
 */

import { App, Modal } from 'obsidian';
import { CSS_PREFIX } from '../constants';
import { EMOJI_CATEGORIES } from '../data/fontawesome-icons';
import { getAllFAProIconNames, getFAProIconHtml } from '../data/fontawesome-pro';

type TabType = 'glyphs' | 'emoji';

export class IconPickerModal extends Modal {
  private onSelect: (icon: string, type: 'fontawesome' | 'emoji') => void;
  private activeTab: TabType = 'glyphs';
  private searchQuery = '';
  private gridContainer: HTMLElement | null = null;
  private allFAIcons: string[] = [];
  private allEmojis: string[] = [];

  constructor(app: App, onSelect: (icon: string, type: 'fontawesome' | 'emoji') => void) {
    super(app);
    this.onSelect = onSelect;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.addClass(`${CSS_PREFIX}icon-picker-modal`);
    contentEl.empty();

    // Title
    contentEl.createEl('h2', { text: 'Icon picker' });

    // Tabs
    const tabContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}icon-picker-tabs` });
    this.createTabs(tabContainer);

    // Search
    const searchContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}icon-picker-search` });
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: 'Search icons...',
      cls: `${CSS_PREFIX}icon-picker-search-input`,
    });
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderGrid();
    });

    // Grid container with event delegation
    this.gridContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}icon-picker-grid-container` });
    this.gridContainer.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest(`.${CSS_PREFIX}icon-picker-btn`) as HTMLElement;
      if (!btn) return;
      const iconName = btn.dataset.icon;
      const iconType = btn.dataset.type as 'fontawesome' | 'emoji';
      if (iconName && iconType) {
        this.onSelect(iconName, iconType);
        this.close();
      }
    });

    // Load data
    this.allFAIcons = await getAllFAProIconNames();
    this.allEmojis = EMOJI_CATEGORIES.flatMap(c => c.icons);
    this.renderGrid();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  private createTabs(container: HTMLElement): void {
    const tabs: { id: TabType; label: string }[] = [
      { id: 'glyphs', label: 'Glyphs' },
      { id: 'emoji', label: 'Emoji' },
    ];

    tabs.forEach((tab) => {
      const tabEl = container.createEl('button', {
        text: tab.label,
        cls: `${CSS_PREFIX}icon-picker-tab${this.activeTab === tab.id ? ' active' : ''}`,
      });
      tabEl.addEventListener('click', () => {
        this.activeTab = tab.id;
        container.querySelectorAll(`.${CSS_PREFIX}icon-picker-tab`).forEach((el) => {
          el.removeClass('active');
        });
        tabEl.addClass('active');
        this.searchQuery = '';
        this.renderGrid();
      });
    });
  }

  private renderGrid(): void {
    if (!this.gridContainer) return;
    this.gridContainer.empty();

    if (this.activeTab === 'glyphs') {
      this.renderFontAwesomeGrid();
    } else {
      this.renderEmojiGrid();
    }
  }

  private renderFontAwesomeGrid(): void {
    if (!this.gridContainer) return;

    let icons = this.allFAIcons;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      icons = icons.filter(name => name.includes(q));
    }

    const grid = this.gridContainer.createDiv({ cls: `${CSS_PREFIX}icon-picker-grid` });

    if (icons.length === 0) {
      grid.createDiv({ cls: `${CSS_PREFIX}icon-picker-empty`, text: 'No icons found' });
      return;
    }

    // Render in chunks for smooth UI
    const CHUNK_SIZE = 300;
    let index = 0;
    const currentGrid = grid;

    const renderChunk = () => {
      if (!currentGrid.isConnected) return;
      const fragment = document.createDocumentFragment();
      const end = Math.min(index + CHUNK_SIZE, icons.length);

      for (let i = index; i < end; i++) {
        const btn = document.createElement('button');
        btn.className = `${CSS_PREFIX}icon-picker-btn`;
        btn.dataset.icon = icons[i];
        btn.dataset.type = 'fontawesome';
        btn.title = icons[i];
        btn.innerHTML = getFAProIconHtml(icons[i]);
        fragment.appendChild(btn);
      }

      currentGrid.appendChild(fragment);
      index = end;

      if (index < icons.length) {
        requestAnimationFrame(renderChunk);
      }
    };

    renderChunk();
  }

  private renderEmojiGrid(): void {
    if (!this.gridContainer) return;

    let emojis = this.allEmojis;
    if (this.searchQuery) {
      // Emoji search is limited but we can still filter
      emojis = this.allEmojis;
    }

    const grid = this.gridContainer.createDiv({ cls: `${CSS_PREFIX}icon-picker-grid` });

    if (emojis.length === 0) {
      grid.createDiv({ cls: `${CSS_PREFIX}icon-picker-empty`, text: 'No icons found' });
      return;
    }

    const fragment = document.createDocumentFragment();
    emojis.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.className = `${CSS_PREFIX}icon-picker-btn ${CSS_PREFIX}icon-picker-btn-emoji`;
      btn.dataset.icon = emoji;
      btn.dataset.type = 'emoji';
      btn.title = emoji;
      btn.textContent = emoji;
      fragment.appendChild(btn);
    });
    grid.appendChild(fragment);
  }
}
