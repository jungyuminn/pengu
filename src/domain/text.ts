const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const LEADING_JAMO = "ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ";

export function normalizeName(value: string): string {
  return toCompatJamo(value.normalize("NFKC").toLowerCase()).replace(
    /[\s"'`~!@#$%^&*()[\]{};:,.<>/?\\|_+=-]+/g,
    "",
  );
}

export function choseong(value: string): string {
  let result = "";
  for (const char of value) {
    const lead = LEADING_JAMO.indexOf(char);
    if (lead >= 0) {
      result += CHOSEONG[lead] ?? "";
      continue;
    }
    const code = char.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      result += CHOSEONG[Math.floor(code / 588)] ?? "";
      continue;
    }
    const compat = toCompatJamo(char);
    if (CHOSEONG.includes(compat)) result += compat;
  }
  return result;
}

function toCompatJamo(value: string): string {
  let result = "";
  for (const char of value) {
    const lead = LEADING_JAMO.indexOf(char);
    result += lead >= 0 ? (CHOSEONG[lead] ?? char) : char;
  }
  return result;
}

export function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let i = 0; i < left.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < right.length; j += 1) {
      const cost = left[i] === right[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + cost,
      );
    }
    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j] ?? 0;
    }
  }

  return previous[right.length] ?? right.length;
}
