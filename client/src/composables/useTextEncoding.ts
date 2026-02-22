/**
 * Composable para reparar texto con problemas de codificación.
 * Corrige tildes (á, é, í, ó, ú) y ñ que aparecen como Ã³, Ã±, etc.
 * cuando UTF-8 fue interpretado incorrectamente como Latin-1.
 */
export function useTextEncoding() {
  function repairUtf8Mojibake(str: string): string {
    if (!str || typeof str !== 'string') return str;
    try {
      const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (decoded.includes('\uFFFD')) return str;
      return decoded;
    } catch {
      return str;
    }
  }

  return { repairUtf8Mojibake };
}
