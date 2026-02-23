import { FileTooLargeException } from "../exceptions/FileTooLargeException";

/** Límite máximo de archivo: 20 MB en bytes. */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Value Object que representa un tamaño de archivo validado.
 *
 * Inmutable, auto-validado (<= 20 MB) y sin dependencias de infraestructura.
 */
export class FileSize {
  /**
   * Valor del tamaño en bytes.
   */
  public readonly value: number;

  /**
   * Crea un nuevo `FileSize` validando que no supere 20 MB.
   *
   * @param bytes - Tamaño del archivo en bytes.
   * @throws {FileTooLargeException} Si el tamaño supera 20 MB.
   */
  constructor(bytes: number) {
    if (!FileSize.isValid(bytes)) {
      throw new FileTooLargeException(bytes);
    }

    this.value = bytes;
  }

  /**
   * Valida si un tamaño en bytes es menor o igual a 20 MB.
   *
   * @param bytes - Tamaño en bytes a validar.
   * @returns `true` si el tamaño es válido (<= 20 MB), `false` en caso contrario.
   */
  public static isValid(bytes: number): boolean {
    return (
      typeof bytes === "number" &&
      Number.isFinite(bytes) &&
      bytes >= 0 &&
      bytes <= MAX_FILE_SIZE_BYTES
    );
  }
}
