/**
 * Styles of the Woodfish section the overlay adds to Codex's Appearance settings. Layout
 * classes are copied from Codex's own rows at mount time; these rules style the parts
 * Codex has no equivalent for (theme tiles, switches) and the fallback layout used when
 * the reference elements cannot be found. Colors come from Codex's variables, so the
 * panel follows whatever theme is active.
 */
export const SETTINGS_PANEL_CSS = `
[data-woodfish-codex-settings] .woodfish-settings-fallback-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
[data-woodfish-codex-settings] .woodfish-settings-fallback-title {
  font-weight: 500;
  color: var(--color-text);
}
[data-woodfish-codex-settings] .woodfish-settings-fallback-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--color-background-panel, transparent);
}
[data-woodfish-codex-settings] .woodfish-settings-fallback-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
}
[data-woodfish-codex-settings] .woodfish-settings-fallback-row + .woodfish-settings-fallback-row {
  border-top: 1px solid var(--color-border);
}
[data-woodfish-codex-settings] .woodfish-settings-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}
[data-woodfish-codex-settings] .woodfish-settings-description {
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-secondary);
}
[data-woodfish-codex-settings] .woodfish-settings-gallery-row {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 12px !important;
  padding-top: 12px !important;
  padding-bottom: 14px !important;
}
[data-woodfish-codex-settings] .woodfish-settings-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 12px;
}
[data-woodfish-codex-settings] .woodfish-settings-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
[data-woodfish-codex-settings] .woodfish-settings-tile[aria-checked="true"] {
  color: var(--color-text);
}
[data-woodfish-codex-settings] .woodfish-settings-tile:focus-visible {
  outline: none;
}
[data-woodfish-codex-settings] .woodfish-settings-preview {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  height: 56px;
  padding: 0 12px;
  border-radius: 10px;
  background-color: var(--woodfish-tile-bg);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-text) 12%, transparent);
  transition: box-shadow 0.15s ease;
}
[data-woodfish-codex-settings] .woodfish-settings-preview > span {
  display: block;
  height: 4px;
  border-radius: 2px;
}
[data-woodfish-codex-settings] .woodfish-settings-tile:hover .woodfish-settings-preview {
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-text) 30%, transparent);
}
[data-woodfish-codex-settings] .woodfish-settings-tile[aria-checked="true"] .woodfish-settings-preview,
[data-woodfish-codex-settings] .woodfish-settings-tile:focus-visible .woodfish-settings-preview {
  box-shadow: 0 0 0 2px var(--color-ring, #339cff);
}
[data-woodfish-codex-settings] .woodfish-settings-switch {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
}
[data-woodfish-codex-settings] .woodfish-settings-switch:focus-visible {
  outline: 2px solid var(--color-ring, #339cff);
  outline-offset: 2px;
}
[data-woodfish-codex-settings] .woodfish-settings-switch-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 32px;
  height: 20px;
  border-radius: 999px;
  background-color: color-mix(in oklab, var(--color-text) 10%, transparent);
  transition: background-color 0.2s ease;
}
[data-woodfish-codex-settings] .woodfish-settings-switch[aria-checked="true"] .woodfish-settings-switch-track {
  background-color: var(--color-chart-blue, var(--color-ring, #339cff));
}
[data-woodfish-codex-settings] .woodfish-settings-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background-color: var(--color-control-thumb-on-accent, #ffffff);
  box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  transform: translateX(2px);
  transition: transform 0.2s ease;
}
[data-woodfish-codex-settings] .woodfish-settings-switch[aria-checked="true"] .woodfish-settings-switch-thumb {
  transform: translateX(14px);
}
[data-woodfish-codex-settings] .woodfish-settings-footnote {
  padding: 8px 4px 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-tertiary, var(--color-text-secondary));
}
[data-woodfish-codex-settings] .woodfish-background-card {
  margin-top: 12px;
}
[data-woodfish-codex-settings] .woodfish-background-thumb {
  background-color: var(--color-surface);
  background-size: cover;
  background-position: center;
}
[data-woodfish-codex-settings] .woodfish-background-plus {
  align-items: center;
  font-size: 22px;
  color: var(--color-text-secondary);
  background-color: color-mix(in oklab, var(--color-text) 5%, transparent);
}
[data-woodfish-codex-settings] .woodfish-background-tile-wrap {
  position: relative;
  display: flex;
}
[data-woodfish-codex-settings] .woodfish-background-tile-wrap > .woodfish-settings-tile {
  flex: 1;
  min-width: 0;
}
[data-woodfish-codex-settings] .woodfish-background-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  color: #ffffff;
  background-color: rgb(0 0 0 / 45%);
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
[data-woodfish-codex-settings] .woodfish-background-tile-wrap:hover .woodfish-background-remove,
[data-woodfish-codex-settings] .woodfish-background-remove:focus-visible {
  opacity: 1;
}
[data-woodfish-codex-settings] .woodfish-background-slider {
  display: flex;
  align-items: center;
  gap: 10px;
}
[data-woodfish-codex-settings] .woodfish-background-range {
  -webkit-appearance: none;
  appearance: none;
  width: 160px;
  height: 4px;
  margin: 0;
  border-radius: 999px;
  background-color: color-mix(in oklab, var(--color-text) 16%, transparent);
  cursor: pointer;
}
[data-woodfish-codex-settings] .woodfish-background-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background-color: var(--color-chart-blue, var(--color-ring, #339cff));
  box-shadow: 0 1px 3px rgb(0 0 0 / 35%);
}
[data-woodfish-codex-settings] .woodfish-background-range:focus-visible {
  outline: 2px solid var(--color-ring, #339cff);
  outline-offset: 4px;
}
[data-woodfish-codex-settings] .woodfish-background-value {
  min-width: 40px;
  text-align: right;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}
[data-woodfish-codex-settings] .woodfish-background-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
[data-woodfish-codex-settings] .woodfish-background-status {
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-secondary);
}
[data-woodfish-codex-settings] .woodfish-background-buttons {
  display: flex;
  gap: 8px;
}
[data-woodfish-codex-settings] .woodfish-background-button {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  color: var(--color-text);
  background-color: transparent;
  cursor: pointer;
}
[data-woodfish-codex-settings] .woodfish-background-button[hidden] {
  display: none;
}
[data-woodfish-codex-settings] .woodfish-background-button:disabled {
  opacity: 0.45;
  cursor: default;
}
[data-woodfish-codex-settings] .woodfish-background-primary {
  border-color: transparent;
  color: var(--color-text-on-accent, #ffffff);
  background-color: var(--color-chart-blue, var(--color-ring, #339cff));
}
@media (prefers-reduced-motion: reduce) {
  [data-woodfish-codex-settings] * {
    transition: none !important;
  }
}
`.trim();
