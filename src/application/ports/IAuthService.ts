export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Port that defines the authentication operations that an external auth service
 * (e.g. Cognito) must implement.
 */
export interface IAuthService {
  /**
   * Register a new user in the external authentication service.
   *
   * The underlying provider is responsible for handling duplicate emails and
   * throwing an error if the email is already registered.
   *
   * @param email - Email address of the user to register.
   * @param password - Plain text password of the user.
   * @returns A promise that resolves with the created user's identifier.
   */
  register(email: string, password: string): Promise<{ userId: string }>;

  /**
   * Authenticate a user with email and password in the external
   * authentication service.
   *
   * @param email - Email address of the user.
   * @param password - Plain text password of the user.
   * @returns A promise that resolves with authentication tokens, including
   *          access token and refresh token.
   * @throws InvalidCredentialsException If the email or password are invalid.
   */
  authenticateWithPassword(
    email: string,
    password: string,
  ): Promise<AuthTokens>;

  /**
   * Validate an access token with the external authentication service.
   *
   * @param token - Access token to validate.
   * @returns A promise that resolves with the user identifier (sub claim)
   *          and email extracted from the token.
   * @throws UnauthorizedError If the token is invalid or expired.
   */
  validateToken(token: string): Promise<{ sub: string; email: string }>;

  /**
   * Generate a new access token from a valid refresh token.
   *
   * @param refreshToken - Refresh token issued during authentication.
   * @returns A promise that resolves with the new access token.
   */
  refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }>;
}

