/**
 * TagInput component for adding/removing tags on pins
 */

import { CSS_PREFIX } from '../constants';

export interface TagInputOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** Initial tags */
  initialTags?: string[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Callback when tags change */
  onChange?: (tags: string[]) => void;
  /** Suggested tags (for autocomplete) */
  suggestions?: string[];
}

export class TagInput {
  private container: HTMLElement;
  private tags: string[] = [];
  private onChange?: (tags: string[]) => void;
  private suggestions: string[] = [];
  
  private tagsContainer!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private suggestionsEl!: HTMLElement;

  constructor(options: TagInputOptions) {
    this.container = options.container;
    this.tags = [...(options.initialTags ?? [])];
    this.onChange = options.onChange;
    this.suggestions = options.suggestions ?? [];
    
    this.render(options.placeholder);
  }

  private render(placeholder?: string): void {
    this.container.addClass(`${CSS_PREFIX}tag-input-wrapper`);
    
    // Tags display area
    this.tagsContainer = this.container.createDiv({ cls: `${CSS_PREFIX}tags-container` });
    this.renderTags();
    
    // Input area
    const inputWrapper = this.container.createDiv({ cls: `${CSS_PREFIX}tag-input-container` });
    
    this.inputEl = inputWrapper.createEl('input', {
      type: 'text',
      placeholder: placeholder ?? 'Add tag...',
      cls: `${CSS_PREFIX}tag-input`,
    });
    
    // Suggestions dropdown
    this.suggestionsEl = inputWrapper.createDiv({ cls: `${CSS_PREFIX}tag-suggestions` });
    this.suggestionsEl.style.display = 'none';
    
    // Event listeners
    this.inputEl.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.inputEl.addEventListener('input', this.handleInput.bind(this));
    this.inputEl.addEventListener('blur', () => {
      // Delay hiding to allow click on suggestion
      setTimeout(() => {
        this.suggestionsEl.style.display = 'none';
      }, 200);
    });
    this.inputEl.addEventListener('focus', () => {
      if (this.inputEl.value.trim()) {
        this.showSuggestions(this.inputEl.value);
      }
    });
  }

  private renderTags(): void {
    this.tagsContainer.empty();
    
    this.tags.forEach((tag) => {
      const tagEl = this.tagsContainer.createDiv({ cls: `${CSS_PREFIX}tag` });
      tagEl.createSpan({ text: tag, cls: `${CSS_PREFIX}tag-text` });
      
      const removeBtn = tagEl.createSpan({ 
        text: '×', 
        cls: `${CSS_PREFIX}tag-remove`,
        attr: { 'aria-label': `Remove ${tag}` }
      });
      
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(tag);
      });
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const value = this.inputEl.value.trim();
    
    if (e.key === 'Enter' && value) {
      e.preventDefault();
      this.addTag(value);
    } else if (e.key === 'Backspace' && !value && this.tags.length > 0) {
      // Remove last tag when backspace on empty input
      this.removeTag(this.tags[this.tags.length - 1]);
    } else if (e.key === 'Escape') {
      this.suggestionsEl.style.display = 'none';
      this.inputEl.blur();
    } else if (e.key === ',' && value) {
      // Comma also adds tag
      e.preventDefault();
      this.addTag(value);
    }
  }

  private handleInput(): void {
    const value = this.inputEl.value.trim();
    if (value) {
      this.showSuggestions(value);
    } else {
      this.suggestionsEl.style.display = 'none';
    }
  }

  private showSuggestions(query: string): void {
    const lowerQuery = query.toLowerCase();
    
    // Filter suggestions that match and aren't already added
    const filtered = this.suggestions.filter(
      (s) => s.toLowerCase().includes(lowerQuery) && !this.tags.includes(s)
    ).slice(0, 5);
    
    if (filtered.length === 0) {
      this.suggestionsEl.style.display = 'none';
      return;
    }
    
    this.suggestionsEl.empty();
    this.suggestionsEl.style.display = 'block';
    
    filtered.forEach((suggestion) => {
      const item = this.suggestionsEl.createDiv({ 
        cls: `${CSS_PREFIX}tag-suggestion-item`,
        text: suggestion 
      });
      
      item.addEventListener('click', () => {
        this.addTag(suggestion);
        this.suggestionsEl.style.display = 'none';
      });
    });
  }

  private addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    
    if (normalizedTag && !this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      this.renderTags();
      this.onChange?.(this.tags);
    }
    
    this.inputEl.value = '';
    this.suggestionsEl.style.display = 'none';
  }

  private removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.renderTags();
      this.onChange?.(this.tags);
    }
  }

  /**
   * Get current tags
   */
  getTags(): string[] {
    return [...this.tags];
  }

  /**
   * Set tags programmatically
   */
  setTags(tags: string[]): void {
    this.tags = [...tags];
    this.renderTags();
  }

  /**
   * Update suggestions list
   */
  setSuggestions(suggestions: string[]): void {
    this.suggestions = suggestions;
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.inputEl.focus();
  }
}
