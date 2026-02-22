import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { SaveRealtimeTranscriptionUseCase } from "../../../application/use-cases/transcription/SaveRealtimeTranscriptionUseCase";
import { transcriptionRepository } from "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance";
import { storageService } from "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors";
import { isValidUuidV4 } from "../../../shared/utils/validation";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const multipart = require("aws-lambda-multipart-parser");

/** Repara texto UTF-8 que fue interpretado incorrectamente como Latin-1 (tildes, ñ). */
function repairUtf8Mojibake(str: string): string {
  try {
    return Buffer.from(str, "latin1").toString("utf8");
  } catch {
    return str;
  }
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new SaveRealtimeTranscriptionUseCase(
  transcriptionRepository,
  storageService
);

function getBearerToken(
  event: { headers?: Record<string, string | undefined> }
): string | null {
  const auth =
    event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

interface MultipartFile {
  type?: string;
  filename?: string;
  contentType?: string;
  content?: Buffer | { type: string; data: number[] };
}

/**
 * POST /transcriptions/realtime/{id}/save
 *
 * Persiste el contenido y el audio de una sesión de transcripción en tiempo real.
 * Acepta multipart/form-data con: content (texto), audioFile (archivo de audio).
 *
 * Flujo: 1) Valida 2) Sube a S3 3) Actualiza DynamoDB
 */
export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    const token = getBearerToken(event);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Falta el header de autorización",
        }),
        headers: corsHeaders,
      };
    }

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    if (!userId || userId.trim() === "") {
      throw new ValidationError("userId no puede ser null o vacío");
    }

    const transcriptionId = event.pathParameters?.id;
    if (!transcriptionId || transcriptionId.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "transcriptionId es requerido en la ruta",
        }),
        headers: corsHeaders,
      };
    }
    if (!isValidUuidV4(transcriptionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "transcriptionId tiene formato inválido",
        }),
        headers: corsHeaders,
      };
    }

    let content = "";
    let audioBuffer: Buffer | null = null;
    let contentType: string | undefined;
    let fileName: string | undefined;

    const contentTypeHeader =
      event.headers?.["Content-Type"] ?? event.headers?.["content-type"] ?? "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      // API Gateway (y serverless-offline con binary) envían body en base64
      const eventToParse = { ...event };
      if (event.isBase64Encoded && typeof event.body === "string") {
        eventToParse.body = Buffer.from(event.body, "base64").toString("binary");
        eventToParse.isBase64Encoded = false;
      }

      const parsed = multipart.parse(eventToParse, false);

      fileName =
        typeof parsed.fileName === "string" && parsed.fileName.trim()
          ? parsed.fileName.trim()
          : undefined;

      const rawContent = parsed.content;
      if (Buffer.isBuffer(rawContent)) {
        content = rawContent.toString("utf8").trim();
      } else if (typeof rawContent === "object" && rawContent !== null && "content" in rawContent) {
        const c = (rawContent as { content?: Buffer | number[] | { type?: string; data?: number[] } })
          .content;
        if (c !== undefined && c !== null) {
          let buf: Buffer;
          if (Buffer.isBuffer(c)) {
            buf = c;
          } else if (Array.isArray((c as { data?: number[] }).data)) {
            buf = Buffer.from((c as { data: number[] }).data);
          } else if (Array.isArray(c)) {
            buf = Buffer.from(c);
          } else {
            buf = Buffer.from(String(c));
          }
          content = buf.toString("utf8").trim();
        }
      } else if (typeof rawContent === "string") {
        content = repairUtf8Mojibake(rawContent).trim();
      } else {
        content = "";
      }
      const audioPart = parsed.audioFile ?? parsed.file;

      if (audioPart && audioPart.content) {
        const c = audioPart.content as Buffer | { type?: string; data?: number[] };
        if (Buffer.isBuffer(c)) {
          audioBuffer = c;
        } else if (c != null && Array.isArray((c as { data?: number[] }).data)) {
          audioBuffer = Buffer.from((c as { data: number[] }).data);
        } else if (c != null && Array.isArray(c)) {
          audioBuffer = Buffer.from(c);
        }
        contentType = (audioPart as MultipartFile).contentType;
      }
    } else if (contentTypeHeader.includes("application/json")) {
      // Cliente envía JSON con audioBase64 (más fiable que multipart con serverless-offline)
      const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
      content = typeof body.content === "string" ? body.content.trim() : "";
      fileName =
        typeof body.fileName === "string" && (body.fileName as string).trim()
          ? (body.fileName as string).trim()
          : undefined;
      const b64 = typeof body.audioBase64 === "string" ? body.audioBase64 : "";
      if (b64) {
        audioBuffer = Buffer.from(b64, "base64");
        contentType = "audio/webm";
      }
    } else {
      const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
      content = typeof body.content === "string" ? body.content.trim() : "";
    }

    let duration: number | undefined;
    try {
      const body = JSON.parse(event.body ?? "{}") as { duration?: number };
      if (typeof body.duration === "number" && body.duration >= 0) {
        duration = body.duration;
      }
    } catch {
      // body vacío o inválido
    }

    if (!content || content.length === 0) {
      throw new ValidationError("content no puede estar vacío");
    }
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new ValidationError(
        "audioFile es requerido (multipart/form-data con campo 'audioFile')"
      );
    }

    const s3Path = `uploads/${userId}/${transcriptionId}/realtime_audio.wav`;
    const result = await useCase.execute(
      transcriptionId,
      userId,
      content,
      audioBuffer,
      contentType,
      fileName,
      duration
    );
    console.log(`[RealtimeSave] Saved to S3 + DynamoDB: ${transcriptionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        transcriptionId: result.transcriptionId,
        status: "completed",
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("[RealtimeSave] ❌ Error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Token inválido o expirado",
        }),
        headers: corsHeaders,
      };
    }

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: error.message,
        }),
        headers: corsHeaders,
      };
    }

    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error interno del servidor",
      }),
      headers: corsHeaders,
    };
  }
};
