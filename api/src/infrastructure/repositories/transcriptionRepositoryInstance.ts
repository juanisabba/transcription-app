import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { TranscriptionRepository } from "./TranscriptionRepository";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "eu-north-1",
});
const docClient = DynamoDBDocumentClient.from(client);

export const transcriptionRepository = new TranscriptionRepository(docClient);
