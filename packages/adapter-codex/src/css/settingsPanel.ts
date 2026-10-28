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
@media (prefers-reduced-motion: reduce) {
  [data-woodfish-codex-settings] * {
    transition: none !important;
  }
}
`.trim();
