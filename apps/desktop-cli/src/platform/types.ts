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
  /** Starts Codex with a loopback-only debugging port. */
  launchWithPort(installation: CodexInstallation, port: number): void;
  /** Starts Codex the normal way (no debugging port). */
  launchNormal(installation: CodexInstallation): void;
  /** Ends every Codex process (closing the window only hides it to the tray). */
  stop(installation: CodexInstallation, state: CodexRuntimeState): void;
  isElevated(): boolean;
  /** Creates a desktop or Start menu shortcut that runs the given command. */
  createShortcut(name: string, target: string, args: readonly string[]): string;
}

export class PlatformError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'PlatformError';
  }
}
