/**
 * Utilidades para manejo seguro de errores con tipado estricto (unknown en lugar de any).
 */

/**
 * Verifica si el error tiene la propiedad name (ej. Cognito UsernameExistsException).
 */
export function hasErrorName(
  error: unknown,
  name: string,
): error is { name: string; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === name
  );
}

/**
 * Obtiene el mensaje de un error de forma segura.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") {
      return msg;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return "Error desconocido";
}
