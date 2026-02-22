/**
 * Utilidades de validación para seguridad y robustez.
 */

/** UUID v4 regex: 8-4-4-4-12 hex digits */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida que un string tenga formato UUID v4 (usado para transcriptionId, etc.).
 * Previene inyección y consultas con IDs malformados a DynamoDB.
 */
export function isValidUuidV4(value: string): boolean {
  return typeof value === "string" && UUID_V4_REGEX.test(value.trim());
}

/** Límite máximo de archivo: 20 MB (20.971.520 bytes) */
export const MAX_FILE_SIZE_BYTES = 20_971_520;

/**
 * Valida que fileSize esté dentro del rango permitido (0, MAX_FILE_SIZE_BYTES].
 */
export function isValidFileSize(size: number): boolean {
  return (
    typeof size === "number" &&
    Number.isFinite(size) &&
    size >= 0 &&
    size <= MAX_FILE_SIZE_BYTES
  );
}
