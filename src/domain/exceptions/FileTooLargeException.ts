import { ValidationError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que el archivo supera el tamaño máximo permitido.
 *
 * Se debe lanzar cuando se valida el tamaño de un archivo (por ejemplo, en un
 * caso de uso de subida de transcripción) y excede el límite de 20 MB.
 * Extiende {@link ValidationError} (HTTP 400) para uso en handlers.
 */
export class FileTooLargeException extends ValidationError {
  public override name = "FileTooLargeException";

  /**
   * Crea una nueva instancia de `FileTooLargeException`.
   *
   * @param sizeBytes - Tamaño del archivo en bytes que superó el límite.
   */
  constructor(sizeBytes?: number) {
    const message = sizeBytes !== undefined
      ? `File size ${sizeBytes} bytes exceeds maximum allowed (20 MB)`
      : "File size exceeds maximum allowed (20 MB)";
    super(message);
  }
}
