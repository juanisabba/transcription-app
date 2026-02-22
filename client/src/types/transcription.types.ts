export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type TranscriptionType = "batch" | "realtime";

export const TRANSCRIPTION_STATUS_LABELS: Record<TranscriptionStatus, string> =
  {
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Listo",
    failed: "Fallido",
  };

export interface Transcription {
  id: string;
  fileName: string;
  status: TranscriptionStatus;
  type?: TranscriptionType;
  duration?: number;
  content?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadTranscriptionRequest {
  fileName: string;
  fileSize: number;
}

export interface ConfirmTranscriptionRequest {
  duration?: number;
}

export interface UploadTranscriptionResponse {
  id: string;
  uploadUrl: string;
  status: "pending";
  expiresIn: number;
}

export interface ListTranscriptionsRequest {
  page: number;
  pageSize?: number;
}

export interface ListTranscriptionsResponse {
  items: Transcription[];
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DownloadTranscriptionResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface RealtimeSessionResponse {
  token: string;
  wsUrl: string;
  ttl: number;
  transcriptionId: string;
}

export interface TranscriptionStatsResponse {
  totalBatchSeconds: number;
  totalRealtimeSeconds: number;
}
