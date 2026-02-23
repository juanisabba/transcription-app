import { S3Client } from "@aws-sdk/client-s3";
import { S3StorageAdapter } from "./S3StorageAdapter";

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "eu-north-1",
});

export const storageService = new S3StorageAdapter(s3Client);
