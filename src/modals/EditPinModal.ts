/**
 * Modal for editing an existing pin
 */

import { App, Modal, Setting } from 'obsidian';
import type { Pin, PinShape, IconDisplayMode } from '../types';
import type TRPGMapsPlugin from '../main';
import { DEFAULT_COLORS, PIN_SHAPES, CSS_PREFIX } from '../constants';
import { getSvgForShape } from '../components/shapes';
import { IconPickerModal } from './IconPickerModal';
import { TagInput } from '../components/TagInput';
import { NoteLinkSuggest } from '../components/NoteLinkSuggest';
import { getIconColor } from '../utils/color';
import { getFAProIconHtml } from '../data/fontawesome-pro';

export class EditPinModal extends Modal {
  private plugin: TRPGMapsPlugin;
  private originalPin: Pin;
  private onSubmit: (pin: Pin) => void;

  // Form state (initialized from original pin)
  private name: string;
  private shape: PinShape;
  private color: string;
  private icon: string;
  private iconType: 'fontawesome' | 'emoji';
  private iconDisplayMode: IconDisplayMode;
  private link: string;
  private tags: string[];
  
  // UI references
  private previewContainer: HTMLElement | null = null;
  private iconDisplayEl: HTMLElement | null = null;
  private tagInput: TagInput | null = null;

  constructor(
    app: App,
    plugin: TRPGMapsPlugin,
    pin: Pin,
    onSubmit: (pin: Pin) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.originalPin = pin;
    this.onSubmit = onSubmit;

    // Initialize form state from existing pin
    this.name = pin.name;
    this.shape = pin.shape;
    this.color = pin.color;
    this.link = pin.link ? this.extractLinkText(pin.link) : '';
    
    // Parse icon (could be "fa:icon-name" or emoji)
    if (pin.icon) {
      if (pin.icon.startsWith('fa:')) {
        this.icon = pin.icon.substring(3);
        this.iconType = 'fontawesome';
      } else {
        this.icon = pin.icon;
        this.iconType = 'emoji';
      }
    } else {
      this.icon = '';
      this.iconType = 'fontawesome';
    }

    // Initialize icon display mode
    this.iconDisplayMode = pin.iconDisplay ?? 'show';
    
    // Initialize tags
    this.tags = [...(pin.tags ?? [])];
  }

  /**
   * Extract the link text from a wikilink format
   */
  private extractLinkText(link: string): string {
    const match = link.match(/^\[\[(.+?)(?:\|.+)?\]\]$/);
    return match ? match[1] : link;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass(`${CSS_PREFIX}modal`);
    contentEl.addClass(`${CSS_PREFIX}create-pin-modal`); // Reuse same styles

    contentEl.createEl('h2', { text: 'Edit Pin' });

    // Preview container
    this.previewContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}pin-preview` });
    this.updatePreview();

    // Name input
    new Setting(contentEl)
      .setName('Name')
      .setDesc('Display name for the pin')
      .addText((text) => {
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
          .setValue(this.iconDisplayMode)
          .onChange((value) => {
            this.iconDisplayMode = value as IconDisplayMode;
            this.updatePreview();
          });
      });

    // Link input with inline autocomplete
    new Setting(contentEl)
      .setName('Link')
      .setDesc('Link to a note, or type "#" to link a specific heading (e.g. Otira#La forge)')
      .addText((text) => {
        text
          .setPlaceholder('Type to search notes...')
          .setValue(this.link)
          .onChange((value) => {
            this.link = value;
          });

        new NoteLinkSuggest(this.app, text.inputEl);
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

    // Action buttons
    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText('Cancel')
          .onClick(() => {
            this.close();
          });
      })
      .addButton((btn) => {
        btn
          .setButtonText('Save')
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
    const finalName = this.name.trim();
    
    if (!finalName) {
      const nameInput = this.contentEl.querySelector('input') as HTMLInputElement;
      nameInput?.focus();
      return;
    }

    // Build the updated pin
    const updatedPin: Pin = {
      ...this.originalPin,
      name: finalName,
      shape: this.shape,
      color: this.color,
    };

    // Handle icon
    if (this.icon.trim()) {
      if (this.iconType === 'fontawesome') {
        updatedPin.icon = `fa:${this.icon.trim()}`;
      } else {
        updatedPin.icon = this.icon.trim();
      }
    } else {
      updatedPin.icon = undefined;
    }

    // Handle link
    if (this.link.trim()) {
      let link = this.link.trim();
      if (!link.startsWith('[[')) {
        link = `[[${link}]]`;
      }
      updatedPin.link = link;
    } else {
      updatedPin.link = undefined;
    }

    // Handle icon display mode (only store if not default)
    if (this.iconDisplayMode !== 'show') {
      updatedPin.iconDisplay = this.iconDisplayMode;
    } else {
      updatedPin.iconDisplay = undefined;
    }

    // Handle tags
    if (this.tags.length > 0) {
      updatedPin.tags = this.tags;
    } else {
      updatedPin.tags = undefined;
    }

    this.onSubmit(updatedPin);
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
    svgContainer.innerHTML = getSvgForShape(this.shape, this.color, iconValue, this.iconDisplayMode);
    
    // Apply icon color to the pin icon
    if (this.icon) {
      const iconColor = getIconColor(this.color);
      const pinIcon = svgContainer.querySelector('.trpg-pin-icon');
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
