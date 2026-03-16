/**
 * Modal for editing an existing text label
 */

import { App, Modal, Setting } from 'obsidian';
import type { Label, LabelFontFamily, LabelFontSize } from '../types';
import {
  CSS_PREFIX,
  DEFAULT_COLORS,
  LABEL_FONT_FAMILIES,
  LABEL_FONT_SIZES,
  LABEL_FONT_SIZE_PX,
} from '../constants';

export class EditLabelModal extends Modal {
  private label: Label;
  private onSubmit: (label: Label) => void;

  // Form state
  private text: string;
  private fontFamily: LabelFontFamily;
  private fontSize: LabelFontSize;
  private bold: boolean;
  private italic: boolean;
  private color: string;
  private strokeWidth: number;
  private rotation: number;
  private curve: number;

  // UI references
  private previewContainer: HTMLElement | null = null;

  constructor(app: App, label: Label, onSubmit: (label: Label) => void) {
    super(app);
    this.label = label;
    this.onSubmit = onSubmit;

    this.text = label.text;
    this.fontFamily = label.fontFamily;
    this.fontSize = label.fontSize;
    this.bold = label.bold;
    this.italic = label.italic;
    this.color = label.color;
    this.strokeWidth = label.strokeWidth ?? 0;
    this.rotation = label.rotation ?? 0;
    this.curve = label.curve ?? 0;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass(`${CSS_PREFIX}modal`);
    contentEl.addClass(`${CSS_PREFIX}label-modal`);

    contentEl.createEl('h2', { text: 'Edit Label' });

    // Preview
    this.previewContainer = contentEl.createDiv({ cls: `${CSS_PREFIX}label-preview` });
    this.updatePreview();

    // Name
    new Setting(contentEl)
      .setName('Name')
      .addText((text) => {
        text.setPlaceholder('Label text').setValue(this.text).onChange((value) => {
          this.text = value;
          this.updatePreview();
        });
        setTimeout(() => text.inputEl.focus(), 10);
      });

    // Font
    const fontSetting = new Setting(contentEl).setName('Font');
    const fontContainer = fontSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}btn-group` });
    this.createFontFamilyButtons(fontContainer);

    // Size
    const sizeSetting = new Setting(contentEl).setName('Size');
    const sizeContainer = sizeSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}btn-group` });
    this.createFontSizeButtons(sizeContainer);

    // Style
    const styleSetting = new Setting(contentEl).setName('Style');
    const styleContainer = styleSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}btn-group` });
    this.createStyleButtons(styleContainer);

    // Text color
    const colorSetting = new Setting(contentEl).setName('Text color');
    const colorContainer = colorSetting.controlEl.createDiv({ cls: `${CSS_PREFIX}color-picker` });
    this.createColorPicker(colorContainer);

    // Stroke
    this.createStrokeControl(contentEl);

    // Rotation
    this.createSliderSetting(contentEl, 'Rotation', 'Rotate label in degrees', 0, 360, 1, this.rotation, (v) => {
      this.rotation = v;
      this.updatePreview();
    });

    // Curve
    this.createSliderSetting(contentEl, 'Curve', 'Bend text along a curve', -100, 100, 1, this.curve, (v) => {
      this.curve = v;
      this.updatePreview();
    });

    // Submit
    new Setting(contentEl).addButton((btn) => {
      btn.setButtonText('Save Label').setCta().onClick(() => this.submit());
    });

    contentEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        this.submit();
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private createFontFamilyButtons(container: HTMLElement): void {
    const fontCSS: Record<LabelFontFamily, string> = {
      sans: 'sans-serif', serif: 'serif', mono: 'monospace',
    };
    const names: Record<LabelFontFamily, string> = {
      sans: 'Sans', serif: 'Serif', mono: 'Mono',
    };

    for (const family of LABEL_FONT_FAMILIES) {
      const btn = container.createEl('button', { cls: `${CSS_PREFIX}btn-pill` });
      const aa = btn.createSpan({ text: 'Aa', cls: `${CSS_PREFIX}btn-pill-sample` });
      aa.style.fontFamily = fontCSS[family];
      btn.createSpan({ text: names[family], cls: `${CSS_PREFIX}btn-pill-label` });

      if (family === this.fontFamily) btn.addClass('active');

      btn.addEventListener('click', () => {
        container.querySelectorAll('.active').forEach((el) => el.removeClass('active'));
        btn.addClass('active');
        this.fontFamily = family;
        this.updatePreview();
      });
    }
  }

  private createFontSizeButtons(container: HTMLElement): void {
    const sizePx: Record<LabelFontSize, string> = { small: '11px', medium: '14px', large: '17px' };
    const sizeNames: Record<LabelFontSize, string> = { small: 'Aa', medium: 'Aa', large: 'AA' };

    for (const size of LABEL_FONT_SIZES) {
      const btn = container.createEl('button', { cls: `${CSS_PREFIX}btn-pill` });
      const label = btn.createSpan({ text: sizeNames[size] });
      label.style.fontSize = sizePx[size];

      if (size === this.fontSize) btn.addClass('active');

      btn.addEventListener('click', () => {
        container.querySelectorAll('.active').forEach((el) => el.removeClass('active'));
        btn.addClass('active');
        this.fontSize = size;
        this.updatePreview();
      });
    }
  }

  private createStyleButtons(container: HTMLElement): void {
    const boldBtn = container.createEl('button', { cls: `${CSS_PREFIX}btn-pill` });
    boldBtn.createSpan({ text: 'Aa' }).style.fontWeight = 'bold';
    if (this.bold) boldBtn.addClass('active');
    boldBtn.addEventListener('click', () => {
      this.bold = !this.bold;
      boldBtn.toggleClass('active', this.bold);
      this.updatePreview();
    });

    const italicBtn = container.createEl('button', { cls: `${CSS_PREFIX}btn-pill` });
    italicBtn.createSpan({ text: 'Aa' }).style.fontStyle = 'italic';
    if (this.italic) italicBtn.addClass('active');
    italicBtn.addEventListener('click', () => {
      this.italic = !this.italic;
      italicBtn.toggleClass('active', this.italic);
      this.updatePreview();
    });
  }

  private createColorPicker(container: HTMLElement): void {
    DEFAULT_COLORS.forEach((colorValue) => {
      const swatch = container.createDiv({ cls: `${CSS_PREFIX}color-swatch` });
      swatch.style.backgroundColor = colorValue;
      if (colorValue === this.color) swatch.addClass('selected');
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

  private createStrokeControl(parent: HTMLElement): void {
    const setting = new Setting(parent).setName('Stroke').setDesc('Text outline width');

    const valueDisplay = setting.controlEl.createSpan({
      cls: `${CSS_PREFIX}slider-value`,
      text: String(this.strokeWidth),
    });

    const slider = setting.controlEl.createEl('input', {
      type: 'range',
      cls: `${CSS_PREFIX}slider`,
      attr: { min: '0', max: '10', step: '1', value: String(this.strokeWidth) },
    });
    slider.addEventListener('input', () => {
      this.strokeWidth = parseInt(slider.value, 10);
      valueDisplay.setText(String(this.strokeWidth));
      this.updatePreview();
    });
  }

  private createSliderSetting(
    parent: HTMLElement,
    name: string,
    desc: string,
    min: number,
    max: number,
    step: number,
    initialValue: number,
    onChange: (value: number) => void
  ): void {
    const setting = new Setting(parent).setName(name).setDesc(desc);

    const valueDisplay = setting.controlEl.createSpan({
      cls: `${CSS_PREFIX}slider-value`,
      text: String(initialValue),
    });

    const slider = setting.controlEl.createEl('input', {
      type: 'range',
      cls: `${CSS_PREFIX}slider`,
      attr: { min: String(min), max: String(max), step: String(step), value: String(initialValue) },
    });
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.setText(String(val));
      onChange(val);
    });
  }

  private updatePreview(): void {
    if (!this.previewContainer) return;
    this.previewContainer.empty();

    const fontFamilyCSS: Record<LabelFontFamily, string> = {
      sans: 'sans-serif', serif: 'serif', mono: 'monospace',
    };

    const previewText = this.previewContainer.createDiv({ cls: `${CSS_PREFIX}label-preview-text` });
    const displayText = this.text || 'Label';
    previewText.setText(displayText);
    previewText.style.fontFamily = fontFamilyCSS[this.fontFamily];
    previewText.style.fontSize = `${LABEL_FONT_SIZE_PX[this.fontSize]}px`;
    previewText.style.fontWeight = this.bold ? 'bold' : 'normal';
    previewText.style.fontStyle = this.italic ? 'italic' : 'normal';
    previewText.style.color = this.color;

    if (this.strokeWidth > 0) {
      const sw = this.strokeWidth;
      previewText.style.webkitTextStroke = `${sw}px rgba(0,0,0,0.7)`;
      previewText.style.paintOrder = 'stroke fill';
      previewText.style.textShadow =
        `-${sw}px -${sw}px 0 rgba(0,0,0,0.5), ${sw}px -${sw}px 0 rgba(0,0,0,0.5), ` +
        `-${sw}px ${sw}px 0 rgba(0,0,0,0.5), ${sw}px ${sw}px 0 rgba(0,0,0,0.5)`;
    }

    if (this.rotation) {
      previewText.style.transform = `rotate(${this.rotation}deg)`;
    }
  }

  private submit(): void {
    const finalText = this.text.trim();
    if (!finalText) {
      const textInput = this.contentEl.querySelector('input[type="text"]') as HTMLInputElement;
      textInput?.focus();
      return;
    }

    const updatedLabel: Label = {
      ...this.label,
      text: finalText,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      bold: this.bold,
      italic: this.italic,
      color: this.color,
      strokeWidth: this.strokeWidth,
      rotation: this.rotation,
      curve: this.curve,
    };

    this.onSubmit(updatedLabel);
    this.close();
  }
}
