/**
 * Status of a Speechmatics transcription job.
 */
export type JobStatus = "running" | "done" | "rejected" | "expired";

/**
 * Port that defines the contract for external transcription APIs (e.g. Speechmatics).
 *
 * Enables asynchronous transcription: submit a job, poll status, or receive
 * results via webhook.
 */
export interface IExternalApiService {
  /**
   * Submits an audio file URL for asynchronous transcription.
   *
   * The URL must be publicly accessible (or a presigned URL) so the provider
   * can fetch the audio. For S3, use a presigned GET URL.
   *
   * @param s3Url - URL of the audio file (e.g. S3 presigned URL).
   * @param language - ISO language code (e.g. "en"). Optional, defaults to provider default.
   * @returns The job ID assigned by the external service.
   */
  submitJob(
    s3Url: string,
    language?: string
  ): Promise<{ jobId: string }>;

  /**
   * Gets the current status of a transcription job.
   *
   * @param jobId - Job ID returned by submitJob.
   * @returns The job status.
   */
  getJobStatus(jobId: string): Promise<JobStatus>;

  /**
   * Gets the transcript result for a completed job.
   *
   * @param jobId - Job ID of a completed job.
   * @returns The transcript text.
   * @throws Error If the job is not done or transcript is unavailable.
   */
  getResult(jobId: string): Promise<{ transcript: string }>;

  /**
   * Creates a short-lived JWT token for the Speechmatics Realtime API.
   *
   * The token is generated via the Speechmatics Management Platform API and
   * should be passed directly to the frontend so it can open a WebSocket
   * connection without exposing the main API key.
   *
   * @param ttl - Token time-to-live in seconds (minimum 60, default 60).
   * @returns The temporary token and the WebSocket URL the client should connect to.
   */
  createRealtimeToken(ttl?: number): Promise<{ token: string; wsUrl: string }>;
}
