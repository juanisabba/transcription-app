import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  Transcription,
  type TranscriptionStatus,
} from "../../domain/entities/Transcription";
import type { ITranscriptionRepository } from "../../domain/repositories/ITranscriptionRepository";

const DEFAULT_PAGE_SIZE = 10;

interface TranscriptionItem {
  userId: string;
  id: string;
  fileName: string;
  fileSize?: number; // Number (no string) para analíticas. Opcional por compatibilidad con items antiguos.
  status: TranscriptionStatus;
  s3Path: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * DynamoDB implementation of ITranscriptionRepository.
 *
 * Persists transcriptions in vocali-transcriptions-{stage}.
 * Uses process.env.DYNAMODB_TRANSCRIPTIONS_TABLE (e.g. vocali-transcriptions-dev)
 * to avoid ResourceNotFoundException. Primary Key: userId (HASH) + id (RANGE).
 * GSI: status-index for queries by status.
 */
export class TranscriptionRepository implements ITranscriptionRepository {
  private readonly tableName =
    process.env.DYNAMODB_TRANSCRIPTIONS_TABLE ?? "vocali-transcriptions-dev";

  constructor(private readonly dynamodbClient: DynamoDBDocumentClient) {}

  async save(transcription: Transcription): Promise<void> {
    try {
      await this.dynamodbClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: this.mapToItem(transcription),
          ConditionExpression: "attribute_not_exists(id)",
        })
      );
    } catch (error) {
      const err = error as { name?: string };
      if (err.name === "ConditionalCheckFailedException") {
        throw new Error(
          `Transcription with id ${transcription.id} already exists`
        );
      }
      console.error("Error saving transcription:", error);
      throw error;
    }
  }

  async findById(id: string, userId: string): Promise<Transcription | null> {
    try {
      const result = await this.dynamodbClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            userId,
            id,
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return this.mapToDomain(result.Item as TranscriptionItem);
    } catch (error) {
      console.error("Error finding transcription by id:", error);
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    limit?: number,
    cursor?: string
  ): Promise<{
    items: Transcription[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;
      const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

      const result = await this.dynamodbClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          Limit: pageSize,
          ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
        })
      );

      const items = (result.Items ?? []).map((item) =>
        this.mapToDomain(item as TranscriptionItem)
      );
      const hasMore = !!result.LastEvaluatedKey;
      const nextCursor = hasMore
        ? this.encodeCursor(result.LastEvaluatedKey as Record<string, unknown>)
        : undefined;

      return { items, hasMore, nextCursor };
    } catch (error) {
      console.error("Error finding transcriptions by userId:", error);
      throw error;
    }
  }

  async update(transcription: Transcription): Promise<void> {
    try {
      await this.dynamodbClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            userId: transcription.userId,
            id: transcription.id,
          },
          UpdateExpression:
            "SET #status = :status, #content = :content, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
            "#content": "content",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":status": transcription.status,
            ":content": transcription.content,
            ":updatedAt": transcription.updatedAt.getTime(),
          },
        })
      );
    } catch (error) {
      console.error("Error updating transcription:", error);
      throw error;
    }
  }

  private mapToItem(transcription: Transcription): TranscriptionItem {
    return {
      userId: transcription.userId,
      id: transcription.id,
      fileName: transcription.fileName,
      fileSize: Number(transcription.fileSize), // DynamoDB: Number type, no string
      status: transcription.status,
      s3Path: transcription.s3Path,
      content: transcription.content,
      createdAt: transcription.createdAt.getTime(),
      updatedAt: transcription.updatedAt.getTime(),
    };
  }

  private mapToDomain(item: TranscriptionItem): Transcription {
    return new Transcription(
      item.id,
      item.userId,
      item.fileName,
      item.fileSize ?? 0, // Backwards compat: items antiguos sin fileSize
      item.status,
      item.s3Path,
      item.content,
      new Date(item.createdAt),
      new Date(item.updatedAt)
    );
  }

  private encodeCursor(key: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(key)).toString("base64url");
  }

  private decodeCursor(cursor: string): Record<string, unknown> {
    return JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf-8")
    ) as Record<string, unknown>;
  }
}
