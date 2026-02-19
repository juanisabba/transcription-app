/**
 * Base class for application errors that can be thrown and caught by HTTP handlers.
 *
 * Provides a stable `code` and `statusCode` so presentation layer can return
 * consistent error responses without depending on domain exception types.
 * Use `instanceof AppError` in catch blocks and optionally call `toJSON()` for the response body.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Serializes the error for HTTP response body (e.g. { code, message }).
   */
  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

/**
 * Error for invalid request payload or parameters (e.g. validation failures).
 * Maps to HTTP 400 Bad Request.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", 400, message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error when the request is not authenticated or the token is invalid/expired.
 * Maps to HTTP 401 Unauthorized.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super("UNAUTHORIZED", 401, message);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error when the operation conflicts with current state (e.g. duplicate resource).
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", 409, message);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error when a requested resource does not exist.
 * Maps to HTTP 404 Not Found.
 *
 * @param resource - Name of the resource (e.g. 'User', 'Transcription').
 * @param id - Identifier that was not found.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", 404, `${resource} with id ${id} not found`);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
