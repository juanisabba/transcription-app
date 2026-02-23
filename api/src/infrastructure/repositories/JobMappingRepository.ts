import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { IJobMappingRepository } from "../../domain/repositories/IJobMappingRepository";

export class JobMappingRepository implements IJobMappingRepository {
  private readonly tableName =
    process.env.DYNAMODB_JOB_MAPPING_TABLE || "vocali-job-mapping-dev";

  constructor(private readonly dynamodbClient: DynamoDBDocumentClient) {}

  async save(
    jobId: string,
    transcriptionId: string,
    userId: string,
  ): Promise<void> {
    await this.dynamodbClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          jobId,
          transcriptionId,
          userId,
        },
      }),
    );
  }

  async findByJobId(
    jobId: string,
  ): Promise<{ transcriptionId: string; userId: string } | null> {
    const result = await this.dynamodbClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { jobId },
      }),
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as {
      jobId: string;
      transcriptionId: string;
      userId: string;
    };
    return {
      transcriptionId: item.transcriptionId,
      userId: item.userId,
    };
  }
}
