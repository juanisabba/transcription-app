import { createHmac, timingSafeEqual } from "node:crypto";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { ProcessTranscriptionResultUseCase } from "../../application/use-cases/transcription/ProcessTranscriptionResultUseCase";
import { transcriptionRepository } from "../../infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { apiResponse } from "../http/helpers/responseHelper";

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  if (expected.length !== signature.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

const useCase = new ProcessTranscriptionResultUseCase(transcriptionRepository, speechMaticsAdapter);

interface SpeechmaticsTranscriptResult {
  alternatives?: Array<{ content: string }>;
  type: string;
}

interface SpeechmaticsWebhookBody {
  job?: { id?: string };
  results?: SpeechmaticsTranscriptResult[];
}

function extractTranscriptFromResults(results: SpeechmaticsTranscriptResult[] | undefined): string {
  if (!results || !Array.isArray(results)) {
    return "";
  }
  return results.map((r) => r.alternatives?.[0]?.content ?? "").join(" ");
}

const jsonResponse = (status: number, body: object): APIGatewayProxyResult =>
  apiResponse(status, body);

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return jsonResponse(400, { error: "Missing request body" });
    }

    const webhookSecret = process.env.SPEECHMATICS_WEBHOOK_SECRET;
    const hdrs = event.headers ?? {};
    const signature = hdrs["X-Webhook-Signature"] ?? hdrs["x-webhook-signature"];

    // Si el secreto está configurado, la firma es obligatoria
    if (webhookSecret && !signature) {
      return jsonResponse(401, { error: "Missing webhook signature" });
    }

    if (webhookSecret && signature) {
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

    // Lógica de procesamiento (ahora con await para asegurar que termine antes de responder)
    try {
      const transcript = extractTranscriptFromResults(parsed?.results);
      const mapping = await jobMappingRepository.findByJobId(jobId);

      if (!mapping) {
        return jsonResponse(200, { ok: true, warning: "No mapping found" });
      }

      const { userId } = mapping;
      if (!userId) {
        return jsonResponse(200, { ok: true, warning: "No userId in mapping" });
      }

      const transcriptionIdToUse =
        mapping.transcriptionId ?? (mapping as { id?: string }).id ?? jobId;

      await useCase.execute(jobId, transcriptionIdToUse, userId, transcript);
    } catch (err) {
      console.error("[WebhookHandler] useCase.execute error:", err);
      // Retornamos 200 de todos modos para que Speechmatics no reintente infinitamente si es un error de lógica
    }

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("[WebhookHandler] unexpected error:", err);
    return jsonResponse(502, { error: "Internal webhook processing error" });
  }
};
