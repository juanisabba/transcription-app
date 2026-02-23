import { createHmac, timingSafeEqual } from "node:crypto";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { ProcessTranscriptionResultUseCase } from "../../application/use-cases/transcription/ProcessTranscriptionResultUseCase";
import { transcriptionRepository } from "../../infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../infrastructure/adapters/external-services/speechMaticsAdapterInstance";

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");
  if (expected.length !== signature.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

const useCase = new ProcessTranscriptionResultUseCase(
  transcriptionRepository,
  speechMaticsAdapter
);

interface SpeechmaticsTranscriptResult {
  alternatives?: Array<{ content: string }>;
  type: string;
}

interface SpeechmaticsWebhookBody {
  job?: { id?: string };
  results?: SpeechmaticsTranscriptResult[];
}

function extractTranscriptFromResults(
  results: SpeechmaticsTranscriptResult[] | undefined
): string {
  if (!results || !Array.isArray(results)) {
    return "";
  }
  return results.map((r) => r.alternatives?.[0]?.content ?? "").join(" ");
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

    const webhookSecret = process.env.SPEECHMATICS_WEBHOOK_SECRET;
    if (webhookSecret) {
      const hdrs = event.headers ?? {};
      const signature = hdrs["X-Webhook-Signature"] ?? hdrs["x-webhook-signature"];
      if (!signature || typeof signature !== "string") {
        return jsonResponse(401, { error: "Missing X-Webhook-Signature header" });
      }
      const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
      if (!verifyWebhookSignature(event.body, sig, webhookSecret)) {
        return jsonResponse(401, { error: "Invalid webhook signature" });
      }
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
    void (async () => {
      try {
        const transcript = extractTranscriptFromResults(parsed?.results);
        const mapping = await jobMappingRepository.findByJobId(jobId);
        if (!mapping) {
          console.error(`Webhook: no mapping found for jobId=${jobId}`);
          return;
        }
        const { userId, transcriptionId } = mapping;
        if (!userId) {
          console.error(
            `Webhook: mapping for jobId=${jobId} lacks userId (legacy record?). Keys: transcriptionId=${transcriptionId}`
          );
          return;
        }
        const transcriptionIdToUse =
          mapping.transcriptionId ?? (mapping as { id?: string }).id ?? jobId;
        await useCase.execute(jobId, transcriptionIdToUse, userId, transcript);
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
