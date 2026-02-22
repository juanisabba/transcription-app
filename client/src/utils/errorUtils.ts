/**
 * Utilidades para manejo seguro de errores con tipado estricto (unknown en lugar de any).
 */

/** Forma típica de error de respuesta Axios con data.message */
interface AxiosErrorResponse {
  response?: {
    data?: { message?: string; details?: string };
    status?: number;
  };
  message?: string;
}

function isAxiosErrorShape(error: unknown): error is AxiosErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "message" in error)
  );
}

/**
 * Extrae mensaje de error de forma segura desde unknown.
 * Prioriza message de API (response.data.message), luego Error.message, luego string genérico.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Ha ocurrido un error",
): string {
  if (isAxiosErrorShape(error)) {
    const apiMessage =
      error.response?.data?.message ?? error.response?.data?.details;
    if (typeof apiMessage === "string") return apiMessage;
    if (error.message && typeof error.message === "string") return error.message;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

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
