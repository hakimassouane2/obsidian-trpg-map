/**
 * Settings tab for TRPG Maps plugin
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type TRPGMapsPlugin from './main';

export class TRPGMapsSettingsTab extends PluginSettingTab {
  plugin: TRPGMapsPlugin;

  constructor(app: App, plugin: TRPGMapsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'TRPG Maps Settings' });

    // Note creation settings
    containerEl.createEl('h3', { text: 'Note Creation' });

    new Setting(containerEl)
      .setName('Default note folder')
      .setDesc('Folder where new notes created from pins will be saved')
      .addText((text) =>
        text
          .setPlaceholder('e.g., Locations')
          .setValue(this.plugin.settings.defaultNoteFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultNoteFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Note template')
      .setDesc('Template file to use when creating notes from pins')
      .addText((text) =>
        text
          .setPlaceholder('e.g., Templates/Location.md')
          .setValue(this.plugin.settings.noteTemplate)
          .onChange(async (value) => {
            this.plugin.settings.noteTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    // Display settings
    containerEl.createEl('h3', { text: 'Display' });

    new Setting(containerEl)
      .setName('Default zoom level')
      .setDesc('Initial zoom level when opening maps (-2 to 4)')
      .addSlider((slider) =>
        slider
          .setLimits(-2, 4, 0.25)
          .setValue(this.plugin.settings.defaultZoom)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.defaultZoom = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show grid')
      .setDesc('Display a grid overlay on maps')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showGrid)
          .onChange(async (value) => {
            this.plugin.settings.showGrid = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Grid type')
      .setDesc('Type of grid to display')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('square', 'Square')
          .addOption('hex-horizontal', 'Hexagonal (flat-top)')
          .addOption('hex-vertical', 'Hexagonal (pointy-top)')
          .setValue(this.plugin.settings.gridType)
          .onChange(async (value) => {
            this.plugin.settings.gridType = value as 'square' | 'hex-horizontal' | 'hex-vertical';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Grid size')
      .setDesc('Size of grid cells in pixels (hex: radius)')
      .addSlider((slider) =>
        slider
          .setLimits(10, 200, 10)
          .setValue(this.plugin.settings.gridSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.gridSize = value;
            await this.plugin.saveSettings();
          })
      );

    // Clustering settings
    containerEl.createEl('h3', { text: 'Clustering' });

    new Setting(containerEl)
      .setName('Enable clustering')
      .setDesc('Group nearby pins when zoomed out')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableClustering)
          .onChange(async (value) => {
            this.plugin.settings.enableClustering = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Cluster threshold')
      .setDesc('Distance in pixels at which pins are grouped')
      .addSlider((slider) =>
        slider
          .setLimits(20, 200, 10)
          .setValue(this.plugin.settings.clusterThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.clusterThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    // About section
    containerEl.createEl('h3', { text: 'About' });

    new Setting(containerEl)
      .setName('Version')
      .setDesc('TRPG Maps plugin version')
      .addButton((button) =>
        button
          .setButtonText(this.plugin.manifest.version)
          .setDisabled(true)
      );
  }
}
