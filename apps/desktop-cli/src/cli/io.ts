import * as readline from 'readline';

export interface Io {
  out(message: string): void;
  err(message: string): void;
  /** Asks a question; resolves with the trimmed answer. Rejects when not interactive. */
  ask(question: string): Promise<string>;
  readonly interactive: boolean;
}

export function createConsoleIo(): Io {
  return {
    out: (message) => process.stdout.write(`${message}\n`),
    err: (message) => process.stderr.write(`${message}\n`),
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    ask: (question) =>
      new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      }),
  };
}

/** Yes/no question; defaults to no. `assumeYes` skips the question. */
export async function confirm(io: Io, question: string, assumeYes: boolean): Promise<boolean> {
  if (assumeYes) {
    return true;
  }
  if (!io.interactive) {
    return false;
  }
  const answer = await io.ask(`${question} [y/N] `);
  return /^(?:y|yes|是|好)$/i.test(answer);
}
