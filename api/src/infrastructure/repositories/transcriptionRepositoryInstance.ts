import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { TranscriptionRepository } from "../../../../src/infrastructure/repositories/TranscriptionRepository";

const dynamodbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-west-1",
});
console.log(`[DynamoDB] Conectando a: AWS DynamoDB (${process.env.AWS_REGION || "eu-west-1"})`);

const docClient = DynamoDBDocumentClient.from(dynamodbClient);
export const transcriptionRepository = new TranscriptionRepository(docClient);
