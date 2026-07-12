/**
 * Inline suggester for note links (appears below the input).
 *
 * Supports two modes:
 *  - When the query has no "#", it suggests matching notes by basename.
 *  - When the query contains "#", it resolves the note before the "#" and
 *    suggests its headings, producing links like "Note#Heading". This lets a
 *    pin point at a specific section of a note (e.g. "Otira#La forge").
 */

import { App, AbstractInputSuggest, TFile } from 'obsidian';

/** A matching note (no heading selected) */
export interface FileLinkSuggestion {
  type: 'file';
  file: TFile;
}

/** A specific heading within a note */
export interface HeadingLinkSuggestion {
  type: 'heading';
  file: TFile;
  heading: string;
  level: number;
}

export type LinkSuggestion = FileLinkSuggestion | HeadingLinkSuggestion;

export class NoteLinkSuggest extends AbstractInputSuggest<LinkSuggestion> {
  private files: TFile[];
  private textInputEl: HTMLInputElement;
  private onSelectCallback?: (suggestion: LinkSuggestion) => void;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    onSelectCallback?: (suggestion: LinkSuggestion) => void
  ) {
    super(app, inputEl);
    this.textInputEl = inputEl;
    this.files = this.app.vault.getMarkdownFiles();
    this.onSelectCallback = onSelectCallback;
  }

  getSuggestions(query: string): LinkSuggestion[] {
    const hashIndex = query.indexOf('#');

    // Heading mode: "Note#partialHeading"
    if (hashIndex !== -1) {
      const notePart = query.slice(0, hashIndex).trim();
      const headingQuery = query.slice(hashIndex + 1).toLowerCase().trim();

      const file = this.resolveFile(notePart);
      if (!file) return [];

      const cache = this.app.metadataCache.getFileCache(file);
      const headings = cache?.headings ?? [];

      return headings
        .filter((h) => h.heading.toLowerCase().includes(headingQuery))
        .slice(0, 10)
        .map((h) => ({
          type: 'heading' as const,
          file,
          heading: h.heading,
          level: h.level,
        }));
    }

    // File mode
    const lowerQuery = query.toLowerCase();
    return this.files
      .filter((file) => file.basename.toLowerCase().includes(lowerQuery))
      .slice(0, 10)
      .map((file) => ({ type: 'file' as const, file }));
  }

  /** Resolve a note by the text typed before "#" (basename or path). */
  private resolveFile(notePart: string): TFile | null {
    if (!notePart) return null;
    const resolved = this.app.metadataCache.getFirstLinkpathDest(notePart, '');
    if (resolved) return resolved;
    // Fallback: exact basename match
    return this.files.find((f) => f.basename.toLowerCase() === notePart.toLowerCase()) ?? null;
  }

  renderSuggestion(suggestion: LinkSuggestion, el: HTMLElement): void {
    if (suggestion.type === 'heading') {
      el.createDiv({ cls: 'suggestion-content' }, (div) => {
        div.createDiv({
          cls: 'suggestion-title',
          text: `${'#'.repeat(suggestion.level)} ${suggestion.heading}`,
        });
        div.createDiv({ cls: 'suggestion-note', text: suggestion.file.basename });
      });
      return;
    }

    const file = suggestion.file;
    el.createDiv({ cls: 'suggestion-content' }, (div) => {
      div.createDiv({ cls: 'suggestion-title', text: file.basename });
      if (file.parent && file.parent.path !== '/') {
        div.createDiv({ cls: 'suggestion-note', text: file.parent.path });
      }
    });
  }

  selectSuggestion(suggestion: LinkSuggestion): void {
    this.textInputEl.value =
      suggestion.type === 'heading'
        ? `${suggestion.file.basename}#${suggestion.heading}`
        : suggestion.file.basename;

    this.textInputEl.dispatchEvent(new Event('input'));
    this.onSelectCallback?.(suggestion);
    // After picking a note the suggester reopens on the next keystroke, so the
    // user can type "#" to browse that note's headings.
    this.close();
  }
}
