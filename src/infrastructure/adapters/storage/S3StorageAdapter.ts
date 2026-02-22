import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IStorageService } from "../../../application/ports/IStorageService";

/** 1 hora. Tiempo razonable para subida/descarga sin comprometer seguridad. */
const DEFAULT_EXPIRES_IN = 3600;

/**
 * S3 implementation of IStorageService.
 *
 * Uses AWS SDK v3 S3Client for presigned URLs, downloads, and deletions.
 * Bucket name is read from S3_BUCKET_NAME env var.
 */
export class S3StorageAdapter implements IStorageService {
  private readonly bucketName: string;
  private readonly s3Client: S3Client;

  constructor(s3Client: S3Client, bucketName?: string) {
    this.s3Client = s3Client;
    this.bucketName = bucketName ?? process.env.S3_BUCKET_NAME ?? "";
  }

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ...(contentType && { ContentType: contentType }),
      })
    );
  }

  /**
   * Genera una URL presignada para PUT.
   * Solo Bucket y Key: sin ChecksumAlgorithm ni headers x-amz-checksum*,
   * de modo que el frontend pueda subir con un PUT simple (fetch/axios + body)
   * sin enviar headers adicionales que romperían la firma.
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRES_IN
  ): Promise<string> {
    const safeExpiresIn = Math.min(Math.max(expiresIn, 60), 86400); // entre 1 min y 24 h
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S3Client/presigner type mismatch en monorepo (handlers privados)
    const url = await getSignedUrl(this.s3Client as any, command, {
      expiresIn: safeExpiresIn,
    });
    return url;
  }

  async generateDownloadPresignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRES_IN
  ): Promise<string> {
    const safeExpiresIn = Math.min(Math.max(expiresIn, 60), 86400); // entre 1 min y 24 h
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S3Client/presigner type mismatch en monorepo (handlers privados)
    const url = await getSignedUrl(this.s3Client as any, command, {
      expiresIn: safeExpiresIn,
    });
    return url;
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async getFile(key: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty response for key: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
