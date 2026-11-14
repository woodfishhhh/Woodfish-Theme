/** An installed Codex desktop package. */
export interface CodexInstallation {
  /** e.g. `OpenAI.Codex`. */
  name: string;
  /** e.g. `OpenAI.Codex_2p2nqsd0c76g0`. */
  familyName: string;
  version: string;
  installLocation: string;
  executable: string;
  appId: string;
}

export interface CodexProcess {
  pid: number;
  commandLine: string;
  /** Seconds since the process started, if known. */
  ageSeconds: number | null;
}

/** A command the per-user logon task runs. */
export interface AutostartCommand {
  execute: string;
  args: readonly string[];
}

export interface CodexRuntimeState {
  /** Main (browser) process of the running app, if any. */
  main: CodexProcess | null;
  processCount: number;
  /** Debugging port the main process was started with, if any. */
  debugPort: number | null;
}

/** Everything the CLI needs from the operating system; one implementation per platform. */
export interface CodexPlatform {
  readonly name: 'windows' | 'darwin';
  discover(): CodexInstallation | null;
  inspect(installation: CodexInstallation): CodexRuntimeState;
  /** Cheap check whether any Codex process runs (does not read command lines). */
  isRunning(): boolean;
  /**
   * Starts Codex with a loopback-only debugging port. From an elevated shell it hands the
   * launch to the desktop shell first, so Codex runs with the user's normal rights.
   */
  launchWithPort(installation: CodexInstallation, port: number): void;
  /** Starts Codex the normal way (no debugging port). */
  launchNormal(installation: CodexInstallation): void;
  /** Ends every Codex process (closing the window only hides it to the tray). */
  stop(installation: CodexInstallation, state: CodexRuntimeState): void;
  isElevated(): boolean;
  /** Creates a desktop or Start menu shortcut that runs the given command. */
  createShortcut(name: string, target: string, args: readonly string[]): string;
  /** Deletes the Start menu shortcut `createShortcut` made; true if it existed. */
  removeShortcut(name: string): boolean;
  /** Codex's data folder: it writes there within a second of starting. */
  userDataDir(installation: CodexInstallation): string | null;
  /** Registers the per-user logon task (normal rights, no window) and starts it now. */
  installAutostart(command: AutostartCommand): void;
  /** Removes the logon task; true if it existed. */
  removeAutostart(): boolean;
  /** The logon task's command line, or null when it is not registered. */
  readAutostart(): string | null;
}

export class PlatformError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'PlatformError';
  }
}
