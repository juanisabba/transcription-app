import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { IAuthService, AuthTokens } from "@application/ports/IAuthService";
import { UnauthorizedError, ConflictError } from "@shared/errors";
import { getErrorMessage, hasErrorName } from "@shared/utils/errorUtils";

export class CognitoAuthAdapter implements IAuthService {
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly cognitoClient: CognitoIdentityProviderClient) {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
    this.clientId = process.env.COGNITO_CLIENT_ID ?? "";

    if (!this.userPoolId || !this.clientId) {
      console.error("[ERROR] Cognito credentials not configured!");
      console.error("COGNITO_USER_POOL_ID:", this.userPoolId);
      console.error("COGNITO_CLIENT_ID:", this.clientId);
    }
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    try {
      const response = await this.cognitoClient.send(
        new SignUpCommand({
          ClientId: this.clientId,
          Username: email,
          Password: password,
          UserAttributes: [{ Name: "email", Value: email }],
        }),
      );

      const userId = response.UserSub;
      if (!userId) {
        throw new Error("No user ID returned from Cognito");
      }

      // Auto-confirm para desarrollo
      if (process.env.COGNITO_AUTO_CONFIRM === "true") {
        await this.cognitoClient.send(
          new AdminConfirmSignUpCommand({
            UserPoolId: this.userPoolId,
            Username: email,
          }),
        );
      }

      return { userId };
    } catch (error: unknown) {
      console.error(`[Cognito.register] Error:`, getErrorMessage(error));

      if (hasErrorName(error, "UsernameExistsException")) {
        throw new ConflictError(`Ya existe un usuario con el email: ${email}`);
      }

      throw error;
    }
  }

  async authenticateWithPassword(
    email: string,
    password: string,
  ): Promise<AuthTokens> {
    try {
      const response = await this.cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      );

      const result = response.AuthenticationResult;
      if (!result?.AccessToken || !result.RefreshToken) {
        throw new UnauthorizedError("No se recibieron tokens de Cognito");
      }
      if (!result.IdToken) {
        throw new UnauthorizedError("Cognito no devolvió IdToken (requerido por API Gateway Authorizer)");
      }

      return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken,
        expiresIn: result.ExpiresIn ?? 3600,
      };
    } catch (error: unknown) {
      console.error(`[Cognito.auth] Error:`, getErrorMessage(error));

      if (hasErrorName(error, "NotAuthorizedException")) {
        throw new UnauthorizedError("Email o contraseña inválidos");
      }

      throw error;
    }
  }

  validateToken(token: string): Promise<{ sub: string; email: string }> {
    if (!token) {
      throw new UnauthorizedError("Token requerido");
    }

    try {
      // Decodificar JWT (sin validar firma en dev, en prod usar JWKS)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new UnauthorizedError("Formato de token inválido");
      }

      interface JwtPayload {
        sub?: string;
        email?: string;
        "cognito:username"?: string;
      }
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString()
      ) as JwtPayload;

      return Promise.resolve({
        sub: payload.sub ?? "",
        email: payload.email ?? payload["cognito:username"] ?? "",
      });
    } catch (error: unknown) {
      console.error(`[Cognito.validate] Error:`, getErrorMessage(error));
      throw new UnauthorizedError("Token inválido");
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedError("Token de refresco requerido");
    }

    try {
      const response = await this.cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      );

      const result = response.AuthenticationResult;
      if (!result?.AccessToken) {
        throw new UnauthorizedError("Error al refrescar el token");
      }

      return { accessToken: result.AccessToken };
    } catch (error: unknown) {
      console.error(`[Cognito.refresh] Error:`, getErrorMessage(error));
      throw error;
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      await this.cognitoClient.send(
        new GlobalSignOutCommand({ AccessToken: accessToken }),
      );
    } catch (error: unknown) {
      console.error(`[Cognito.logout] Error:`, getErrorMessage(error));
      throw error;
    }
  }
}
