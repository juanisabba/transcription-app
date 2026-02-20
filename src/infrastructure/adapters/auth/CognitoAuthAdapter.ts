import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { IAuthService, AuthTokens } from "@application/ports/IAuthService";
import { UnauthorizedError, ConflictError } from "@shared/errors";

export class CognitoAuthAdapter implements IAuthService {
  private readonly userPoolId: string;
  private readonly clientId: string;
  private readonly region: string;

  constructor(private readonly cognitoClient: CognitoIdentityProviderClient) {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
    this.clientId = process.env.COGNITO_CLIENT_ID ?? "";
    this.region = process.env.AWS_REGION ?? "eu-north-1";

    if (!this.userPoolId || !this.clientId) {
      console.error("[ERROR] Cognito credentials not configured!");
      console.error("COGNITO_USER_POOL_ID:", this.userPoolId);
      console.error("COGNITO_CLIENT_ID:", this.clientId);
    }

    console.log("[Cognito] Using REAL Cognito");
    console.log("[Cognito] User Pool ID:", this.userPoolId);
    console.log("[Cognito] Region:", this.region);
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    try {
      console.log(`[Cognito.register] Registering: ${email}`);

      const response = await this.cognitoClient.send(
        new SignUpCommand({
          ClientId: this.clientId,
          Username: email,
          Password: password,
          UserAttributes: [{ Name: "email", Value: email }],
        })
      );

      const userId = response.UserSub;
      if (!userId) {
        throw new Error("No user ID returned from Cognito");
      }

      console.log(`[Cognito.register] Success: ${userId}`);

      // Auto-confirm para desarrollo
      if (process.env.COGNITO_AUTO_CONFIRM === "true") {
        console.log(`[Cognito.register] Auto-confirming user: ${email}`);
        await this.cognitoClient.send(
          new AdminConfirmSignUpCommand({
            UserPoolId: this.userPoolId,
            Username: email,
          })
        );
      }

      return { userId };
    } catch (error: any) {
      console.error(`[Cognito.register] Error:`, error.message);

      if (error.name === "UsernameExistsException") {
        throw new ConflictError(`User already exists: ${email}`);
      }

      throw error;
    }
  }

  async authenticateWithPassword(
    email: string,
    password: string
  ): Promise<AuthTokens> {
    try {
      console.log(`[Cognito.auth] Authenticating: ${email}`);

      const response = await this.cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        })
      );

      const result = response.AuthenticationResult;
      if (!result?.AccessToken || !result.RefreshToken) {
        throw new UnauthorizedError("No tokens from Cognito");
      }

      console.log(`[Cognito.auth] Success: tokens returned`);

      return {
        accessToken: result.AccessToken,
        refreshToken: result.RefreshToken,
        expiresIn: result.ExpiresIn ?? 3600,
      };
    } catch (error: any) {
      console.error(`[Cognito.auth] Error:`, error.message);

      if (error.name === "NotAuthorizedException") {
        throw new UnauthorizedError("Invalid email or password");
      }

      throw error;
    }
  }

  async validateToken(token: string): Promise<{ sub: string; email: string }> {
    if (!token) {
      throw new UnauthorizedError("Token required");
    }

    try {
      console.log(`[Cognito.validate] Validating token`);

      // Decodificar JWT (sin validar firma en dev, en prod usar JWKS)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new UnauthorizedError("Invalid token format");
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString()
      );

      console.log(`[Cognito.validate] Token valid for: ${payload.email}`);

      return {
        sub: payload.sub,
        email: payload.email ?? payload["cognito:username"] ?? "",
      };
    } catch (error: any) {
      console.error(`[Cognito.validate] Error:`, error.message);
      throw new UnauthorizedError("Invalid token");
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token required");
    }

    try {
      console.log(`[Cognito.refresh] Refreshing token`);

      const response = await this.cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        })
      );

      const result = response.AuthenticationResult;
      if (!result?.AccessToken) {
        throw new UnauthorizedError("Refresh failed");
      }

      console.log(`[Cognito.refresh] Success`);

      return { accessToken: result.AccessToken };
    } catch (error: any) {
      console.error(`[Cognito.refresh] Error:`, error.message);
      throw error;
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      console.log(`[Cognito.logout] Logging out`);

      await this.cognitoClient.send(
        new GlobalSignOutCommand({ AccessToken: accessToken })
      );

      console.log(`[Cognito.logout] Success`);
    } catch (error: any) {
      console.error(`[Cognito.logout] Error:`, error.message);
      throw error;
    }
  }
}
