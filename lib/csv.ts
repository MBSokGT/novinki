// Excel "Save As CSV" on a Russian-locale Windows machine writes
// Windows-1251, not UTF-8 — PapaParse assuming UTF-8 blindly doesn't error
// on that, it just silently produces mojibake Cyrillic that nobody notices
// until it's already imported. Decode strictly as UTF-8 first (fails loudly
// on any non-UTF-8 byte sequence) and fall back to Windows-1251 only then.
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1251').decode(buffer)
  }
}
