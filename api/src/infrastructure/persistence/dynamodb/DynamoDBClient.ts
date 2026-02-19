import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient as AWSDynamoDBClient } from "@aws-sdk/client-dynamodb";

export interface DynamoDBClientConfig {
  tableName: string;
  endpoint?: string;
  region?: string;
}

/**
 * Thin wrapper around AWS DynamoDB DocumentClient for the users table.
 * Supports put, get by id, query by email (GSI: email-index), and update.
 */
export class DynamoDBClient {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(config: DynamoDBClientConfig) {
    const client = new AWSDynamoDBClient({
      region: config.region ?? "eu-west-1",
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = config.tableName;
  }

  async put(item: Record<string, unknown>): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  async get(key: { id: string }): Promise<Record<string, unknown> | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id: key.id },
      }),
    );
    return (result.Item as Record<string, unknown>) ?? null;
  }

  async queryByEmail(email: string): Promise<Record<string, unknown>[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      }),
    );
    return (result.Items as Record<string, unknown>[]) ?? [];
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: "SET lastLoginAt = :now",
        ExpressionAttributeValues: { ":now": new Date().toISOString() },
      }),
    );
  }
}
