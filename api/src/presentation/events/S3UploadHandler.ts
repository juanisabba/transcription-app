import type { S3Handler, S3Event } from "aws-lambda";
import { StartTranscriptionUseCase } from "../../application/use-cases/transcription/StartTranscriptionUseCase";
import { transcriptionRepository } from "../../infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { storageService } from "../../infrastructure/adapters/storage/storageServiceInstance";
import { MAX_FILE_SIZE_BYTES } from "../../shared/utils/validation";

const useCase = new StartTranscriptionUseCase(
  transcriptionRepository,
  jobMappingRepository,
  speechMaticsAdapter,
  storageService
);

/**
 * Extrae userId y transcriptionId de la clave S3.
 *
 * Formato esperado: uploads/{userId}/{transcriptionId}/{fileName}
 */
function parseS3Key(key: string): { userId: string; transcriptionId: string } | null {
  const decoded = decodeURIComponent(key.replace(/\+/g, " "));
  const parts = decoded.split("/");
  // parts: ["uploads", "{userId}", "{transcriptionId}", "{fileName}"]
  if (parts.length < 4 || parts[0] !== "uploads") {
    return null;
  }
  const userId = parts[1];
  const transcriptionId = parts[2];
  if (!userId || !transcriptionId) {
    return null;
  }
  return { userId, transcriptionId };
}

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    const objectSize = record.s3.object.size ?? 0;
    if (objectSize > MAX_FILE_SIZE_BYTES) {
      console.error(
        `[S3UploadHandler] Object size ${objectSize} exceeds limit ${MAX_FILE_SIZE_BYTES}, skipping`
      );
      continue;
    }

    const parsed = parseS3Key(key);
    if (!parsed) {
      console.error(`[S3UploadHandler] Could not parse key: ${key}`);
      continue;
    }

    const { userId, transcriptionId } = parsed;

    try {
      await useCase.execute(userId, transcriptionId, key);
      console.log(`[S3UploadHandler] Speechmatics job submitted: transcriptionId=${transcriptionId}`);
    } catch (error) {
      console.error(
        `[S3UploadHandler] Failed to start transcription job for transcriptionId=${transcriptionId}:`,
        error
      );
    }
  }
};
