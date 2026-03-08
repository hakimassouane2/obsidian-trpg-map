/**
 * Modal for creating a new pin
 */

import { App, Modal, Setting, TFile, AbstractInputSuggest } from 'obsidian';
import type { Pin, PinShape, IconDisplayMode } from '../types';
import type TRPGMapsPlugin from '../main';
import { DEFAULT_COLORS, DEFAULT_PIN_COLOR, DEFAULT_PIN_SHAPE, PIN_SHAPES, CSS_PREFIX } from '../constants';
import { getSvgForShape } from '../components/shapes';
import { IconPickerModal } from './IconPickerModal';
import { TagInput } from '../components/TagInput';
import { getIconColor } from '../utils/color';
import { getFAProIconHtml } from '../data/fontawesome-pro';

interface CreatePinOptions {
  x: number;
  y: number;
}

/**
 * Inline suggester for note links (appears below the input)
 */
class NoteLinkSuggest extends AbstractInputSuggest<TFile> {
  private files: TFile[];
  private textInputEl: HTMLInputElement;
  private onSelectCallback?: (file: TFile) => void;

  constructor(app: App, inputEl: HTMLInputElement, onSelectCallback?: (file: TFile) => void) {
    super(app, inputEl);
    this.textInputEl = inputEl;
    this.files = this.app.vault.getMarkdownFiles();
    this.onSelectCallback = onSelectCallback;
  }

  getSuggestions(query: string): TFile[] {
    const lowerQuery = query.toLowerCase();
    return this.files
      .filter(file => file.basename.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ cls: 'suggestion-content' }, (div) => {
      div.createDiv({ cls: 'suggestion-title', text: file.basename });
      if (file.parent && file.parent.path !== '/') {
        div.createDiv({ cls: 'suggestion-note', text: file.parent.path });
      }
    });
  }

  selectSuggestion(file: TFile): void {
    this.textInputEl.value = file.basename;
    this.textInputEl.dispatchEvent(new Event('input'));
    this.onSelectCallback?.(file);
    this.close();
  }
}

export class CreatePinModal extends Modal {
  private plugin: TRPGMapsPlugin;
  private options: CreatePinOptions;
  private onSubmit: (pin: Partial<Pin>) => void;

  // Form state
  private name = '';
  private shape: PinShape = DEFAULT_PIN_SHAPE;
  private color: string = DEFAULT_PIN_COLOR;
  private icon = '';
  private iconType: 'fontawesome' | 'emoji' = 'fontawesome';
  private iconDisplay: IconDisplayMode = 'show';
  private link = '';
  private tags: string[] = [];
  
  // UI references
  private previewContainer: HTMLElement | null = null;
  private nameInputEl: HTMLInputElement | null = null;
  private iconDisplayEl: HTMLElement | null = null;
  private tagInput: TagInput | null = null;

  constructor(
    app: App,
    plugin: TRPGMapsPlugin,
    options: CreatePinOptions,
    onSubmit: (pin: Partial<Pin>) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.options = options;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass(`${CSS_PREFIX}modal`);
    contentEl.addClass(`${CSS_PREFIX}create-pin-modal`);

    contentEl.createEl('h2', { text: 'Create Pin' });

    // Preview container
    this.previewContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}pin-preview` });
    this.updatePreview();

    // Name input
    new Setting(contentEl)
      .setName('Name')
      .setDesc('Display name for the pin (auto-filled from link)')
      .addText((text) => {
        this.nameInputEl = text.inputEl;
        text
          .setPlaceholder('Enter pin name')
          .setValue(this.name)
          .onChange((value) => {
            this.name = value;
          });

        setTimeout(() => text.inputEl.focus(), 10);
      });

    // Shape selector
    new Setting(contentEl)
      .setName('Shape')
      .setDesc('Pin marker shape')
      .addDropdown((dropdown) => {
        PIN_SHAPES.forEach((shape) => {
          dropdown.addOption(shape, this.capitalizeFirst(shape));
        });
        dropdown.setValue(this.shape);
        dropdown.onChange((value) => {
          this.shape = value as PinShape;
          this.updatePreview();
        });
      });

    // Color selector
    const colorSetting = new Setting(contentEl)
      .setName('Color')
      .setDesc('Pin marker color');

    const colorContainer = colorSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}color-picker` });
    this.createColorPicker(colorContainer);

    // Icon selector with picker button
    const iconSetting = new Setting(contentEl)
      .setName('Icon')
      .setDesc('Choose an icon (optional)');

    // Icon display and button
    const iconControl = iconSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}icon-selector` });
    
    this.iconDisplayEl = iconControl.createDiv({ cls: `${CSS_PREFIX}icon-display` });
    this.updateIconDisplay();

    const chooseIconBtn = iconControl.createEl('button', {
      text: 'Choose Icon',
      cls: `${CSS_PREFIX}icon-choose-btn`,
    });
    chooseIconBtn.addEventListener('click', () => {
      this.openIconPicker();
    });

    const clearIconBtn = iconControl.createEl('button', {
      text: '✕',
      cls: `${CSS_PREFIX}icon-clear-btn`,
      attr: { 'aria-label': 'Clear icon' },
    });
    clearIconBtn.addEventListener('click', () => {
      this.icon = '';
      this.updateIconDisplay();
      this.updatePreview();
    });

    // Icon display mode selector
    new Setting(contentEl)
      .setName('Icon display')
      .setDesc('How to display the icon')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('show', 'Show (shape + icon)')
          .addOption('hide', 'Hide (shape only)')
          .addOption('icon-only', 'Icon only')
          .setValue(this.iconDisplay)
          .onChange((value) => {
            this.iconDisplay = value as IconDisplayMode;
            this.updatePreview();
          });
      });

    // Link input with inline autocomplete
    new Setting(contentEl)
      .setName('Link')
      .setDesc('Link to an existing note (optional, auto-fills name)')
      .addText((text) => {
        text
          .setPlaceholder('Type to search notes...')
          .setValue(this.link)
          .onChange((value) => {
            this.link = value;
          });
        
        new NoteLinkSuggest(this.app, text.inputEl, (file) => {
          if (!this.name.trim() && this.nameInputEl) {
            this.name = file.basename;
            this.nameInputEl.value = file.basename;
          }
        });
      });

    // Tags input
    const tagsSetting = new Setting(contentEl)
      .setName('Tags')
      .setDesc('Add tags to categorize this pin (press Enter or comma to add)');
    
    const tagsContainer = tagsSetting.controlEl.createDiv();
    this.tagInput = new TagInput({
      container: tagsContainer,
      initialTags: this.tags,
      placeholder: 'Add tag...',
      onChange: (tags) => {
        this.tags = tags;
      },
    });

    // Submit button
    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText('Create Pin')
          .setCta()
          .onClick(() => {
            this.submit();
          });
      });

    // Handle Enter key
    contentEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        this.submit();
      }
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  private openIconPicker(): void {
    new IconPickerModal(this.app, (icon, type) => {
      this.icon = icon;
      this.iconType = type;
      this.updateIconDisplay();
      this.updatePreview();
    }).open();
  }

  private updateIconDisplay(): void {
    if (!this.iconDisplayEl) return;
    this.iconDisplayEl.empty();

    if (this.icon) {
      if (this.iconType === 'emoji') {
        this.iconDisplayEl.setText(this.icon);
      } else {
        // Font Awesome Pro icon
        const iconWrapper = this.iconDisplayEl.createDiv({ cls: `${CSS_PREFIX}icon-display-fa` });
        iconWrapper.innerHTML = getFAProIconHtml(this.icon);
      }
      this.iconDisplayEl.removeClass('empty');
    } else {
      this.iconDisplayEl.setText('No icon');
      this.iconDisplayEl.addClass('empty');
    }
  }

  private submit(): void {
    let finalName = this.name.trim();
    if (!finalName && this.link.trim()) {
      finalName = this.link.trim();
    }
    
    if (!finalName) {
      const nameInput = this.contentEl.querySelector('input') as HTMLInputElement;
      nameInput?.focus();
      return;
    }

    const pinData: Partial<Pin> = {
      name: finalName,
      x: this.options.x,
      y: this.options.y,
      shape: this.shape,
      color: this.color,
    };

    if (this.icon.trim()) {
      // Store icon with type prefix for Font Awesome
      if (this.iconType === 'fontawesome') {
        pinData.icon = `fa:${this.icon.trim()}`;
      } else {
        pinData.icon = this.icon.trim();
      }
    }

    // Only save iconDisplay if not default
    if (this.iconDisplay !== 'show') {
      pinData.iconDisplay = this.iconDisplay;
    }

    // Only save tags if there are any
    if (this.tags.length > 0) {
      pinData.tags = this.tags;
    }

    if (this.link.trim()) {
      let link = this.link.trim();
      if (!link.startsWith('[[')) {
        link = `[[${link}]]`;
      }
      pinData.link = link;
    }

    this.onSubmit(pinData);
    this.close();
  }

  private updatePreview(): void {
    if (!this.previewContainer) return;
    
    this.previewContainer.empty();
    
    // Generate the full pin shape with icon included
    const iconValue = this.icon 
      ? (this.iconType === 'fontawesome' ? `fa:${this.icon}` : this.icon) 
      : undefined;
    
    const svgContainer = this.previewContainer.createDiv({ cls: `${CSS_PREFIX}preview-shape` });
    svgContainer.innerHTML = getSvgForShape(this.shape, this.color, iconValue, this.iconDisplay);
    
    // Apply icon color to the pin icon (for show mode and icon-only mode)
    if (this.icon && this.iconDisplay !== 'hide') {
      const iconColor = this.iconDisplay === 'icon-only' ? this.color : getIconColor(this.color);
      const pinIcon = svgContainer.querySelector('.trpg-pin-icon, .trpg-pin-icon-standalone');
      if (pinIcon) {
        (pinIcon as HTMLElement).style.color = iconColor;
      }
    }
  }

  private createColorPicker(container: HTMLElement): void {
    DEFAULT_COLORS.forEach((colorValue) => {
      const swatch = container.createDiv({
        cls: `${CSS_PREFIX}color-swatch`,
      });
      swatch.style.backgroundColor = colorValue;

      if (colorValue === this.color) {
        swatch.addClass('selected');
      }

      swatch.onclick = () => {
        container.querySelectorAll('.selected').forEach((el) => el.removeClass('selected'));
        swatch.addClass('selected');
        this.color = colorValue;
        this.updatePreview();
      };
    });

    const customInput = container.createEl('input', {
      type: 'color',
      cls: `${CSS_PREFIX}color-custom`,
      value: this.color,
    });
    customInput.onchange = () => {
      this.color = customInput.value;
      container.querySelectorAll('.selected').forEach((el) => el.removeClass('selected'));
      this.updatePreview();
    };
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
