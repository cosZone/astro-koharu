/** Quote a string using the CSSOM string serialization rules. */
export function quoteCssString(value: string): string {
  let serialized = '"';

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint === 0) {
      serialized += '\uFFFD';
    } else if ((codePoint >= 0x01 && codePoint <= 0x1f) || codePoint === 0x7f) {
      serialized += `\\${codePoint.toString(16)} `;
    } else if (character === '"' || character === '\\') {
      serialized += `\\${character}`;
    } else {
      serialized += character;
    }
  }

  return `${serialized}"`;
}
