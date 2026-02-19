import { S3Client } from "@aws-sdk/client-s3";
import { S3StorageAdapter } from "../../../../../src/infrastructure/adapters/storage/S3StorageAdapter";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-1",
  // Evita checksums automáticos (CRC32, etc.) en presigned URLs.
  // El frontend sube con PUT simple; headers x-amz-checksum* romperían la firma.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export const storageService = new S3StorageAdapter(
  s3Client,
  process.env.S3_BUCKET_NAME
);
