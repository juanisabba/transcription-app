import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../../domain/entities/User";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";

const EMAIL_INDEX = "email-index";

interface UserItem {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt?: number;
}

/**
 * DynamoDB implementation of IUserRepository.
 * Persists users in vocali-users-{stage}.
 */
export class UserRepository implements IUserRepository {
  private readonly tableName =
    process.env.DYNAMODB_USERS_TABLE ?? "vocali-users-dev";

  constructor(private readonly dynamodbClient: DynamoDBDocumentClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.dynamodbClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: EMAIL_INDEX,
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
    );

    const item = result.Items?.[0] as UserItem | undefined;
    if (!item) return null;
    return this.mapToDomain(item);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.dynamodbClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId: id },
      })
    );

    if (!result.Item) return null;
    return this.mapToDomain(result.Item as UserItem);
  }

  async save(user: User): Promise<void> {
    await this.dynamodbClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          userId: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt.getTime(),
        },
      })
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.dynamodbClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: "SET lastLoginAt = :now",
        ExpressionAttributeValues: { ":now": Date.now() },
      })
    );
  }

  private mapToDomain(item: UserItem): User {
    return new User(
      item.userId,
      item.email,
      item.passwordHash,
      new Date(item.createdAt)
    );
  }
}
