# Woodfish Settings Runtime Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove misleading runtime settings, switch UI/runtime truth to real payload detection, migrate known legacy Woodfish payloads, and update docs/tests to match.

**Architecture:** Keep feature flags focused on visible effect toggles, move runtime truth into the integrated runtime service, and let status/menu UI render from a combined snapshot of feature flags plus detected runtime state. Add a narrow legacy-takeover layer in the workbench patcher/runtime state so only known Woodfish payloads are migrated.

**Tech Stack:** TypeScript, VS Code extension API, Jest, integrated workbench injection runtime

---

### Task 1: Lock config cleanup behavior with failing tests

**Files:**
- Modify: `src/__tests__/featureFlags.test.ts`
- Modify: `src/__tests__/payloadBuilder.test.ts`
- Test: `src/__tests__/featureFlags.test.ts`
- Test: `src/__tests__/payloadBuilder.test.ts`

- [ ] **Step 1: Write failing tests for removed settings**
- [ ] **Step 2: Run `npm test -- featureFlags.test.ts payloadBuilder.test.ts --runInBand` and confirm failures mention removed runtime/preset expectations**
- [ ] **Step 3: Remove deleted config keys from `package.json`, `src/types/features.ts`, `src/constants/config.ts`, and `src/config/featureFlags.ts`**
- [ ] **Step 4: Re-run `npm test -- featureFlags.test.ts payloadBuilder.test.ts --runInBand` and confirm pass**

### Task 2: Add runtime status model and legacy takeover tests

**Files:**
- Modify: `src/__tests__/workbenchPatcher.test.ts`
- Create: `src/__tests__/runtimeState.test.ts`
- Test: `src/__tests__/workbenchPatcher.test.ts`
- Test: `src/__tests__/runtimeState.test.ts`

- [ ] **Step 1: Write failing tests for runtime status detection and known-legacy payload takeover**
- [ ] **Step 2: Run `npm test -- workbenchPatcher.test.ts runtimeState.test.ts --runInBand` and confirm failures are for missing runtime status / takeover helpers**
- [ ] **Step 3: Implement runtime snapshot types and helpers in `src/types/features.ts`, `src/services/runtime/state.ts`, and `src/services/runtime/workbenchPatcher.ts`**
- [ ] **Step 4: Re-run `npm test -- workbenchPatcher.test.ts runtimeState.test.ts --runInBand` and confirm pass**

### Task 3: Refactor integrated runtime commands and service

**Files:**
- Modify: `src/config/featureState.ts`
- Modify: `src/services/runtime/service.ts`
- Modify: `src/commands/enableTheme.ts`
- Modify: `src/commands/disableTheme.ts`
- Modify: `src/commands/autoConfigureRainbowCursor.ts`
- Modify: `src/commands/completeUninstall.ts`

- [ ] **Step 1: Extend or add failing tests that cover command paths no longer writing `runtime.enabled`**
- [ ] **Step 2: Run targeted Jest command for the touched tests and confirm failure**
- [ ] **Step 3: Implement command/service changes so enable/disable/repair/uninstall use real runtime status and legacy takeover**
- [ ] **Step 4: Re-run targeted Jest command and confirm pass**

### Task 4: Update status bar and feature menu UI from runtime truth

**Files:**
- Modify: `src/__tests__/showFeatureMenu.test.ts`
- Modify: `src/ui/statusBar.ts`
- Modify: `src/commands/showFeatureMenu.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Write failing tests for `on|paused|off` rendering and menu descriptions**
- [ ] **Step 2: Run `npm test -- showFeatureMenu.test.ts --runInBand` and confirm failure**
- [ ] **Step 3: Implement combined feature/runtime snapshot rendering**
- [ ] **Step 4: Re-run `npm test -- showFeatureMenu.test.ts --runInBand` and confirm pass**

### Task 5: Update docs and release notes to match shipped behavior

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/TROUBLESHOOTING.md`
- Modify: `docs/CHANGELOG.md`
- Modify: `src/__tests__/legacyCleanup.test.ts`

- [ ] **Step 1: Write failing doc assertions for the new settings model**
- [ ] **Step 2: Run `npm test -- legacyCleanup.test.ts --runInBand` and confirm failure**
- [ ] **Step 3: Rewrite docs/examples to match real settings and runtime behavior**
- [ ] **Step 4: Re-run `npm test -- legacyCleanup.test.ts --runInBand` and confirm pass**

### Task 6: Full verification

**Files:**
- Modify: none expected

- [ ] **Step 1: Run `npm test -- --runInBand`**
- [ ] **Step 2: Run `npm run compile`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: If a command fails, fix the code and repeat verification**
