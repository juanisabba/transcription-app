import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { TranscriptionRepository } from "./TranscriptionRepository";

const region = process.env.AWS_REGION ?? "eu-north-1";
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region });

export const transcriptionRepository = new TranscriptionRepository(
  docClient,
  s3Client
);
