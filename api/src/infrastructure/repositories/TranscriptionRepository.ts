import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  Transcription,
  type TranscriptionStatus,
  type TranscriptionType,
} from "../../domain/entities/Transcription";
import type { ITranscriptionRepository } from "../../domain/repositories/ITranscriptionRepository";

const DEFAULT_PAGE_SIZE = 10;

interface TranscriptionItem {
  userId: string;
  id: string;
  fileName: string;
  fileSize?: number;
  status: TranscriptionStatus;
  s3Path: string;
  content: string;
  type?: TranscriptionType;
  duration?: number;
  createdAt: number;
  updatedAt?: number; // Opcional por compatibilidad con items antiguos sin este atributo
}

const CREATED_AT_INDEX = "createdAt-index";

/**
 * DynamoDB implementation of ITranscriptionRepository.
 *
 * Persists transcriptions in vocali-transcriptions-{stage}.
 * Primary Key: userId (HASH) + id (RANGE).
 * GSI createdAt-index: userId (HASH) + createdAt (RANGE) para ordenar de más nuevo a más viejo.
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
        }),
      );
      console.log(`[TranscriptionRepo] Saved to DynamoDB: ${transcription.id}`);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name: string }).name === "ConditionalCheckFailedException"
      ) {
        throw new Error(
          `Transcription with id ${transcription.id} already exists`,
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
        }),
      );

      if (!result.Item) return null;
      return this.mapToDomain(result.Item as TranscriptionItem);
    } catch (error: unknown) {
      console.error("Error finding transcription by id:", error);
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    limit?: number,
    cursor?: string,
  ): Promise<{
    items: Transcription[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;
      const decodedCursor = cursor ? this.decodeCursor(cursor) : undefined;
      const exclusiveStartKey = decodedCursor
        ? this.normalizeExclusiveStartKey(decodedCursor)
        : undefined;

      // Pedimos pageSize+1 para saber con certeza si hay más: si obtenemos
      // más de pageSize, hasMore=true; si no, hasMore=false (evita falsos
      // positivos de LastEvaluatedKey cuando no hay más registros).
      const result = await this.dynamodbClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: CREATED_AT_INDEX,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          Limit: pageSize + 1,
          ScanIndexForward: false, // Orden descendente (más recientes primero)
          ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
        }),
      );

      const allItems = (result.Items ?? []).map((item) =>
        this.mapToDomain(item as TranscriptionItem),
      );

      const hasMore = allItems.length > pageSize;
      const items = hasMore ? allItems.slice(0, pageSize) : allItems;
      // Cursor debe incluir userId, id (SK tabla), createdAt (SK GSI) para que
      // ExclusiveStartKey identifique exactamente el ítem tras el que continuar.
      const nextCursor = hasMore && items.length > 0
        ? (() => {
            const lastItem = items[items.length - 1];
            const cursorKey: Record<string, unknown> = {
              userId,
              id: lastItem.id,
              createdAt: lastItem.createdAt.getTime(),
            };
            return this.encodeCursor(cursorKey);
          })()
        : undefined;

      return { items, hasMore, nextCursor };
    } catch (error: unknown) {
      console.error("Error finding transcriptions by userId:", error);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      await this.dynamodbClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { userId, id },
        }),
      );
      console.log(`[TranscriptionRepo] Deleted from DynamoDB: ${id}`);
    } catch (error: unknown) {
      console.error("Error deleting transcription:", error);
      throw error;
    }
  }

  async getStatsByUserId(
    userId: string,
  ): Promise<{ totalBatchSeconds: number; totalRealtimeSeconds: number }> {
    try {
      let totalBatchSeconds = 0;
      let totalRealtimeSeconds = 0;
      let exclusiveStartKey: Record<string, unknown> | undefined;

      do {
        const result = await this.dynamodbClient.send(
          new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: { ":userId": userId },
            ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
          }),
        );

        for (const item of result.Items ?? []) {
          const t = item as TranscriptionItem;
          const duration = t.duration ?? 0;
          if (t.type === "batch") totalBatchSeconds += duration;
          else if (t.type === "realtime") totalRealtimeSeconds += duration;
        }

        exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (exclusiveStartKey);

      return { totalBatchSeconds, totalRealtimeSeconds };
    } catch (error: unknown) {
      console.error("Error getting stats by userId:", error);
      throw error;
    }
  }

  async update(transcription: Transcription): Promise<void> {
    try {
      // CORREGIDO: Usar ambas claves
      const updateParts: string[] = [
        "#status = :status",
        "#content = :content",
        "#updatedAt = :updatedAt",
      ];
      const exprNames: Record<string, string> = {
        "#status": "status",
        "#content": "content",
        "#updatedAt": "updatedAt",
      };
      const exprValues: Record<string, unknown> = {
        ":status": transcription.status,
        ":content": transcription.content,
        ":updatedAt": transcription.updatedAt.getTime(),
      };

      if (transcription.s3Path) {
        updateParts.push("#s3Path = :s3Path");
        exprNames["#s3Path"] = "s3Path";
        exprValues[":s3Path"] = transcription.s3Path;
      }
      if (transcription.fileName) {
        updateParts.push("#fileName = :fileName");
        exprNames["#fileName"] = "fileName";
        exprValues[":fileName"] = transcription.fileName;
      }
      if (typeof transcription.fileSize === "number") {
        updateParts.push("#fileSize = :fileSize");
        exprNames["#fileSize"] = "fileSize";
        exprValues[":fileSize"] = transcription.fileSize;
      }
      if (typeof transcription.duration === "number") {
        updateParts.push("#duration = :duration");
        exprNames["#duration"] = "duration";
        exprValues[":duration"] = transcription.duration;
      }
      if (transcription.type === "batch" || transcription.type === "realtime") {
        updateParts.push("#type = :type");
        exprNames["#type"] = "type";
        exprValues[":type"] = transcription.type;
      }

      await this.dynamodbClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            userId: transcription.userId,
            id: transcription.id,
          },
          UpdateExpression: `SET ${updateParts.join(", ")}`,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
        }),
      );
    } catch (error: unknown) {
      console.error("Error updating transcription:", error);
      throw error;
    }
  }

  private mapToItem(transcription: Transcription): TranscriptionItem {
    const item: TranscriptionItem = {
      userId: transcription.userId,
      id: transcription.id,
      fileName: transcription.fileName,
      fileSize: Number(transcription.fileSize),
      status: transcription.status,
      s3Path: transcription.s3Path,
      content: transcription.content,
      createdAt: transcription.createdAt.getTime(),
      updatedAt: transcription.updatedAt.getTime(),
    };
    if (transcription.type === "batch" || transcription.type === "realtime") {
      item.type = transcription.type;
    }
    if (typeof transcription.duration === "number") {
      item.duration = transcription.duration;
    }
    return item;
  }

  private mapToDomain(item: TranscriptionItem): Transcription {
    const updatedAt = item.updatedAt ?? item.createdAt;
    return new Transcription(
      item.id,
      item.userId,
      item.fileName,
      item.fileSize ?? 0,
      item.status,
      item.s3Path,
      item.content,
      new Date(item.createdAt),
      new Date(updatedAt),
      item.duration,
      item.type,
    );
  }

  private encodeCursor(key: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(key)).toString("base64url");
  }

  private decodeCursor(cursor: string): Record<string, unknown> {
    return JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf-8"),
    ) as Record<string, unknown>;
  }

  /**
   * Normaliza el cursor decodificado para pasarlo como ExclusiveStartKey.
   * Garantiza que createdAt sea Number (evita saltos por tipo incorrecto).
   */
  private normalizeExclusiveStartKey(
    decoded: Record<string, unknown>,
  ): Record<string, unknown> {
    const createdAt = decoded.createdAt;
    const normalized: Record<string, unknown> = {
      userId: decoded.userId,
      id: decoded.id,
      createdAt:
        typeof createdAt === "number"
          ? createdAt
          : typeof createdAt === "string"
            ? Number(createdAt)
            : 0,
    };
    return normalized;
  }
}
