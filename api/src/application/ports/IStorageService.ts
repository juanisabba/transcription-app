/**
 * Port that defines storage operations for S3-compatible services.
 *
 * Allows upload via presigned URLs, download, and deletion of files
 * without coupling the application to AWS SDK specifics.
 */
export interface IStorageService {
  /**
   * Uploads a file (buffer) directly to S3.
   *
   * @param key - S3 object key (path) where the file will be stored.
   * @param body - File contents as Buffer or Uint8Array.
   * @param contentType - Optional MIME type (e.g. "audio/wav", "audio/webm").
   */
  uploadFile(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<void>;

  /**
   * Generates a presigned URL for uploading a file to S3.
   *
   * The client can use this URL to PUT the file directly to S3 without
   * passing through the API, reducing load and enabling large uploads.
   *
   * @param key - S3 object key (path) where the file will be stored.
   * @param expiresIn - URL validity in seconds (optional, default implementation-dependent).
   * @returns A promise that resolves with the presigned URL string.
   */
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Deletes a file from S3.
   *
   * @param key - S3 object key (path) of the file to delete.
   * @returns A promise that resolves when the file is deleted.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Generates a presigned URL for downloading/reading a file from S3.
   *
   * Useful to provide third-party services (e.g. Speechmatics) with a
   * temporary URL to fetch the audio file directly from S3.
   *
   * @param key - S3 object key (path) of the file to read.
   * @param expiresIn - URL validity in seconds (optional).
   * @returns A promise that resolves with the presigned GET URL string.
   */
  generateDownloadPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Retrieves a file from S3 as a buffer.
   *
   * @param key - S3 object key (path) of the file to retrieve.
   * @returns A promise that resolves with the file contents as a Buffer.
   */
  getFile(key: string): Promise<Buffer>;
}
