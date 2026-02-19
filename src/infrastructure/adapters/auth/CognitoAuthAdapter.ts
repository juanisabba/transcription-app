import { randomUUID } from "crypto";
import type { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  NotAuthorizedException,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import type { IAuthService, AuthTokens } from "@application/ports/IAuthService";
import { UnauthorizedError, ConflictError } from "@shared/errors";

/**
 * Hybrid implementation: Cognito real en producción, mocks en desarrollo.
 */
/** userId fijo en dev para que GET transcriptions coincida con registros en DynamoDB local. */
const DEV_USER_ID = process.env.DEV_USER_ID ?? "user-123";

export class CognitoAuthAdapter implements IAuthService {
  private readonly userPoolId: string;
  private readonly clientId: string;
  private readonly region: string;
  private readonly isDev: boolean;
  private readonly jwks: ReturnType<typeof jwksClient>;

  constructor(private readonly cognitoClient: CognitoIdentityProviderClient) {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
    this.clientId = process.env.COGNITO_CLIENT_ID ?? "";
    this.region = process.env.AWS_REGION ?? "eu-north-1";
    this.isDev = process.env.STAGE === "dev" || !!process.env.DYNAMODB_ENDPOINT;
    const jwksUri = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`;
    this.jwks = jwksClient({ jwksUri, cache: true, cacheMaxAge: 600000 });
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    if (this.isDev) {
      console.log(`[COGNITO-DEV] register: returning mock userId`);
      return { userId: randomUUID() };
    }

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
      if (!userId) throw new Error("No user ID from Cognito");

      if (process.env.COGNITO_AUTO_CONFIRM === "true") {
        await this.cognitoClient.send(
          new AdminConfirmSignUpCommand({
            UserPoolId: this.userPoolId,
            Username: email,
          }),
        );
      }

      return { userId };
    } catch (error: any) {
      if (error.name === "UsernameExistsException") {
        throw new ConflictError(`User already exists: ${email}`);
      }
      throw error;
    }
  }

  async authenticateWithPassword(
    email: string,
    password: string,
  ): Promise<AuthTokens> {
    if (this.isDev) {
      console.log(
        `[COGNITO-DEV] authenticateWithPassword: returning mock tokens`,
      );
      return {
        accessToken: "mock-access-token-" + randomUUID(),
        refreshToken: "mock-refresh-token-" + randomUUID(),
        expiresIn: 3600,
      };
    }

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
        throw new UnauthorizedError("No tokens returned");
      }

      return {
        accessToken: result.AccessToken,
        refreshToken: result.RefreshToken,
        expiresIn: result.ExpiresIn ?? 3600,
      };
    } catch (error: any) {
      if (error.name === "NotAuthorizedException") {
        throw new UnauthorizedError("Invalid email or password");
      }
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ sub: string; email: string }> {
    if (!token) throw new UnauthorizedError("Token required");

    if (this.isDev) {
      // Mock: sub fijo para coincidir con registros en DynamoDB local (configurable con DEV_USER_ID)
      console.log(`[COGNITO-DEV] validateToken: returning fixed sub=${DEV_USER_ID}`);
      return { sub: DEV_USER_ID, email: "mock@example.com" };
    }

    return new Promise((resolve, reject) => {
      const getKey = (header: JwtHeader, cb: SigningKeyCallback) => {
        this.jwks.getSigningKey(header.kid)
          .then((key) => {
            const pk = key?.getPublicKey();
            cb(null, pk ?? undefined);
          })
          .catch((err) => cb(err));
      };

      jwt.verify(
        token,
        getKey,
        {
          algorithms: ["RS256"],
          issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
        },
        (err, decoded) => {
          if (err) {
            reject(new UnauthorizedError("Invalid or expired token"));
            return;
          }
          const payload = decoded as { sub?: string; username?: string; client_id?: string };
          const sub = payload.sub;
          const email = payload.username ?? payload.sub ?? "";
          if (!sub) {
            reject(new UnauthorizedError("Token missing sub claim"));
            return;
          }
          if (this.clientId && payload.client_id && payload.client_id !== this.clientId) {
            reject(new UnauthorizedError("Token client_id mismatch"));
            return;
          }
          resolve({ sub, email });
        }
      );
    });
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) throw new UnauthorizedError("Refresh token required");

    if (this.isDev) {
      return { accessToken: "mock-access-token-" + randomUUID() };
    }

    const response = await this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }),
    );

    if (!response.AuthenticationResult?.AccessToken) {
      throw new UnauthorizedError("Refresh failed");
    }

    return { accessToken: response.AuthenticationResult.AccessToken };
  }

  async logout(accessToken: string): Promise<void> {
    if (this.isDev) {
      console.log(`[COGNITO-DEV] logout: mock`);
      return;
    }

    await this.cognitoClient.send(
      new GlobalSignOutCommand({ AccessToken: accessToken }),
    );
  }
}
