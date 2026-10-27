// Слова длиной < 4 обычно "хочу", "нужен", "такой", "для" и т.п. — не несут
// смысла для сопоставления, только шумят.
const MIN_WORD_LENGTH = 4

export function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length >= MIN_WORD_LENGTH)
}
