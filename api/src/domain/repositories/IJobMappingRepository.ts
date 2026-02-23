/**
 * Mapping between external service job IDs (e.g. Speechmatics) and our transcription IDs.
 *
 * Required for webhook callbacks where we only receive the job ID.
 */
export interface IJobMappingRepository {
  /**
   * Saves a mapping from job ID to transcription.
   *
   * @param jobId - ID returned by the external transcription service.
   * @param transcriptionId - Our internal transcription ID.
   * @param userId - Owner of the transcription.
   */
  save(
    jobId: string,
    transcriptionId: string,
    userId: string
  ): Promise<void>;

  /**
   * Finds transcription ID and user ID by job ID.
   *
   * @param jobId - External job ID from the webhook.
   * @returns The mapping or null if not found.
   */
  findByJobId(
    jobId: string
  ): Promise<{ transcriptionId: string; userId: string } | null>;
}
