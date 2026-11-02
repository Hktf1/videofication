/** 保留原文字符，优先在标点处分割；长句也不会超过上限。 */
export function splitByLength(text: string, maxChars: number): string[] {
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error("maxChars 必须是正整数");
  const chars = [...text];
  const chunks: string[] = [];
  while (chars.length) {
    let end = Math.min(maxChars, chars.length);
    if (end < chars.length) {
      for (let i = end - 1; i >= Math.floor(end / 2); i--) {
        if (/[。！？；\n]/.test(chars[i])) { end = i + 1; break; }
      }
    }
    chunks.push(chars.splice(0, end).join(""));
  }
  return chunks;
}
