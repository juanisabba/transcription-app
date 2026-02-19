import { ValidationError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que el tipo de archivo proporcionado
 * no es válido para la operación.
 *
 * Se debe lanzar cuando se valida el tipo de archivo de entrada (por ejemplo,
 * en un caso de uso de subida de transcripción) y no cumple con los formatos
 * aceptados (por ejemplo, audio/video).
 * Extiende {@link ValidationError} (HTTP 400) para uso en handlers.
 */
export class InvalidFileTypeException extends ValidationError {
  public override name = "InvalidFileTypeException";

  /**
   * Crea una nueva instancia de `InvalidFileTypeException`.
   *
   * @param fileType - Tipo o extensión del archivo inválido (opcional).
   */
  constructor(fileType?: string) {
    const message = fileType !== undefined
      ? `Invalid file type: ${fileType}`
      : "Invalid file type";
    super(message);
  }
}
