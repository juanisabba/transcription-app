import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { ProcessTranscriptionResultUseCase } from "../../application/use-cases/transcription/ProcessTranscriptionResultUseCase";
import { transcriptionRepository } from "../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../../api/src/infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance";

const useCase = new ProcessTranscriptionResultUseCase(
  transcriptionRepository,
  speechMaticsAdapter
);

interface SpeechmaticsTranscriptResult {
  alternatives?: Array<{ content: string }>;
  type: string;
}

interface SpeechmaticsTranscriptBody {
  results?: SpeechmaticsTranscriptResult[];
}

interface SpeechmaticsWebhookBody {
  job?: { id?: string };
  results?: SpeechmaticsTranscriptResult[];
}

function extractTranscriptFromResults(
  results: SpeechmaticsTranscriptResult[] | undefined
): string | undefined {
  if (!results || !Array.isArray(results)) return undefined;
  return results
    .filter(
      (r) => r.type === "word" && r.alternatives?.[0]?.content
    )
    .map((r) => r.alternatives![0].content)
    .join(" ")
    .trim();
}

const jsonResponse = (status: number, body: object): APIGatewayProxyResult => ({
  statusCode: status,
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return jsonResponse(400, { error: "Missing request body" });
    }

    let parsed: SpeechmaticsWebhookBody;
    try {
      parsed = JSON.parse(event.body) as SpeechmaticsWebhookBody;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    if (!parsed?.job?.id) {
      return jsonResponse(400, { error: "Missing job.id in body" });
    }

    const jobId = parsed.job.id;

    // Responder 200 inmediatamente para evitar que ngrok/túnel expire
    const okResponse = jsonResponse(200, { ok: true });

    // Lógica pesada en background (no bloquear la respuesta)
    (async () => {
      try {
        const transcript = extractTranscriptFromResults(parsed?.results);
        const mapping = await jobMappingRepository.findByJobId(jobId);
        if (!mapping) {
          console.error(`Webhook: no mapping found for jobId=${jobId}`);
          return;
        }
        await useCase.execute(
          jobId,
          mapping.transcriptionId,
          mapping.userId,
          transcript
        );
      } catch (err) {
        console.error("WebhookHandler background error:", err);
      }
    })();

    return okResponse;
  } catch (err) {
    console.error("WebhookHandler unexpected error:", err);
    return jsonResponse(502, { error: "Internal webhook processing error" });
  }
};
