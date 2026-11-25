/** Scoped native-matching CSS for the Woodfish tab inside dsh's Settings modal. */
export const WOODFISH_SETTINGS_UI_STYLE_ID = 'woodfish-dsh-settings-ui';

export const WOODFISH_SETTINGS_UI_CSS = `
.wf-root {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 24px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
}

.wf-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.wf-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.wf-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 24px;
  color: var(--dsw-alias-label-primary);
}

.wf-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

.wf-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.wf-status-pill {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
}

.wf-status-pill[data-state="saved"] {
  color: var(--dsw-alias-state-success-primary);
}

.wf-status-pill[data-state="error"] {
  color: var(--dsw-alias-state-error-primary);
}

.wf-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.wf-tab {
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: calc(9px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  padding: 5px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.wf-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.wf-tab[aria-selected="true"] {
  background: var(--dsw-alias-state-business-tertiary);
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.wf-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: calc(14px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background: var(--dsw-alias-card-fill);
  border: 0.5px solid var(--dsw-alias-border-l2);
}

.wf-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.wf-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.wf-section-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

.wf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: calc(8px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-button-floating-fill);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.wf-btn:hover:not(:disabled) {
  background: var(--dsw-alias-button-floating-hover);
  border-color: var(--dsw-alias-border-l4);
}

.wf-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.wf-btn-primary {
  background: var(--dsw-alias-state-business-primary);
  border-color: transparent;
  color: var(--dsw-alias-label-on-color);
}

.wf-btn-primary:hover:not(:disabled) {
  background: var(--dsw-alias-button-info-hover);
  border-color: transparent;
}

.wf-segments {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  padding: 2px;
  border-radius: calc(9px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background: var(--dsw-alias-bg-module-platform);
  border: 0.5px solid var(--dsw-alias-border-l2);
}

.wf-segment {
  border: none;
  border-radius: calc(7px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 12px;
  line-height: 18px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.wf-segment:hover {
  color: var(--dsw-alias-label-primary);
}

.wf-segment[aria-checked="true"] {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
  box-shadow: 0 1px 2px rgb(0 0 0 / 16%);
}

.wf-group-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
  margin-top: 4px;
}

.wf-palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
  gap: 8px;
}

.wf-palette-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: calc(10px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
}

.wf-palette-card:hover {
  border-color: var(--dsw-alias-border-l4);
  transform: translateY(-1px);
}

.wf-palette-card[aria-checked="true"] {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary);
}

.wf-palette-preview {
  height: 36px;
  border-radius: calc(6px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  padding: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 0.5px solid rgb(128 128 128 / 22%);
  overflow: hidden;
}

.wf-palette-bars {
  display: flex;
  gap: 4px;
  align-items: center;
}

.wf-palette-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  corner-shape: round;
  flex-shrink: 0;
}

.wf-palette-bar {
  height: 4px;
  border-radius: 999px;
  corner-shape: round;
  flex: 1;
}

.wf-palette-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-bg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 8px;
}

.wf-bg-tile-wrap {
  position: relative;
}

.wf-bg-tile {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border-radius: calc(10px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.wf-bg-tile[aria-checked="true"] {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary);
}

.wf-bg-thumb {
  width: 100%;
  height: 54px;
  border-radius: calc(6px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background-size: cover;
  background-position: center;
  background-color: var(--dsw-alias-bg-module-platform);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--dsw-alias-label-secondary);
}

.wf-bg-label {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-bg-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  corner-shape: round;
  background: rgb(0 0 0 / 62%);
  color: #ffffff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.wf-bg-remove:hover {
  background: var(--dsw-alias-state-error-primary);
}

.wf-bg-dropzone[data-dragging="true"] {
  outline: 2px dashed var(--dsw-alias-state-business-primary);
  outline-offset: 4px;
}

.wf-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}

.wf-effect-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wf-effect-card {
  border-radius: calc(12px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  overflow: hidden;
}

.wf-effect-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.wf-effect-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wf-effect-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.wf-effect-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.wf-effect-id {
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-tertiary);
}

.wf-effect-desc {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

.wf-effect-error {
  font-size: 12px;
  color: var(--dsw-alias-state-error-primary);
  margin-top: 2px;
}

.wf-effect-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.wf-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-border-l4);
  cursor: pointer;
  transition: background-color 140ms ease;
  flex-shrink: 0;
}

.wf-switch[aria-checked="true"] {
  background: var(--dsw-alias-state-business-primary);
}

.wf-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  corner-shape: round;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 28%);
  transition: transform 140ms ease;
}

.wf-switch[aria-checked="true"] .wf-switch-thumb {
  transform: translateX(16px);
}

.wf-effect-body {
  border-top: 0.5px solid var(--dsw-alias-border-l2);
  padding: 6px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wf-param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 9px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

.wf-param-row.wf-param-stacked {
  flex-direction: column;
  align-items: stretch;
}

.wf-param-row:last-of-type {
  border-bottom: none;
}

.wf-param-label-wrap {
  flex: 1 1 180px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wf-param-row.wf-param-stacked .wf-param-label-wrap {
  flex: none;
}

.wf-param-label {
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.wf-param-desc {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

.wf-param-override {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  corner-shape: round;
  background: var(--dsw-alias-state-warn-tertiary);
  color: var(--dsw-alias-state-warn-label);
}

.wf-param-control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  max-width: 100%;
}

.wf-param-row.wf-param-stacked .wf-param-control {
  justify-content: flex-start;
  flex-shrink: 1;
}

.wf-slider-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.wf-range {
  width: 136px;
  accent-color: var(--dsw-alias-state-business-primary);
  cursor: pointer;
}

.wf-value-badge {
  min-width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}

.wf-select {
  height: 30px;
  padding: 0 8px;
  border-radius: calc(8px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.wf-color-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wf-color-input {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.wf-color-text {
  width: 82px;
  height: 26px;
  padding: 0 7px;
  border-radius: 6px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 12px;
}

.wf-effect-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 0.5px dashed var(--dsw-alias-border-l2);
}

.wf-css-editor {
  width: 100%;
  min-height: 140px;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: calc(10px * var(--squircle-k, 1));
  corner-shape: var(--squircle-shape, round);
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 12px;
  line-height: 1.55;
  resize: vertical;
}

.wf-css-editor:focus {
  outline: none;
  border-color: var(--dsw-alias-state-business-primary);
}

.wf-css-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
`;
