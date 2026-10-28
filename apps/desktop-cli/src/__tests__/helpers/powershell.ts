/** Inverse of encodeCommand, for assertions. */
export function decodeCommand(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf16le');
}
