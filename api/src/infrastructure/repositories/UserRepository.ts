import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../../domain/entities/User";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";

/**
 * DynamoDB implementation of IUserRepository.
 */
export class UserRepository implements IUserRepository {
  private readonly tableName = process.env.DYNAMODB_USERS_TABLE || "vocali-users-dev";

  constructor(private readonly dynamodbClient: DynamoDBDocumentClient) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.dynamodbClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "email-index",
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": email,
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const item = result.Items[0] as Record<string, unknown>;
      return this.mapToDomain(item);
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.dynamodbClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            id: id, // <--- CAMBIADO: de userId a id
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return this.mapToDomain(result.Item as Record<string, unknown>);
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    try {
      // Nota: El check de findByEmail ya lo hace el Use Case,
      // pero se mantiene aquí por seguridad si así lo deseas.

      await this.dynamodbClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            id: user.id, // <--- CAMBIADO: de userId a id para coincidir con la tabla
            email: user.email,
            passwordHash: user.passwordHash,
            createdAt: user.createdAt.getTime(),
            updatedAt: new Date().getTime(),
          },
          // Asegura que no sobreescribimos por ID
          ConditionExpression: "attribute_not_exists(id)",
        })
      );

      console.log(`User saved: ${user.email}`);
    } catch (error) {
      const err = error as { name?: string };
      if (err.name === "ConditionalCheckFailedException") {
        throw new Error(`User with ID ${user.id} already exists`);
      }
      console.error("Error saving user:", error);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.dynamodbClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            id: id, // <--- CAMBIADO: de userId a id
          },
          UpdateExpression: "SET lastLoginAt = :now, updatedAt = :now",
          ExpressionAttributeValues: {
            ":now": new Date().getTime(),
          },
        })
      );

      console.log(`Updated last login for user: ${id}`);
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  private mapToDomain(item: Record<string, unknown>): User {
    return new User(
      item.id as string, // <--- CAMBIADO: de userId a id
      item.email as string,
      item.passwordHash as string,
      new Date(item.createdAt as number)
    );
  }
}
