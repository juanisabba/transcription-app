import type { AxiosInstance } from "axios";
import type {
  UploadTranscriptionRequest,
  UploadTranscriptionResponse,
  ListTranscriptionsRequest,
  ListTranscriptionsResponse,
  RealtimeSessionResponse,
  TranscriptionStatsResponse,
} from "../types/transcription.types";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const transcriptionService = {
  upload: async (
    api: AxiosInstance,
    request: UploadTranscriptionRequest,
  ): Promise<UploadTranscriptionResponse> => {
    const { data } = await api.post("/transcriptions/upload", request);
    return data;
  },

  uploadWithConfirmation: async (
    api: AxiosInstance,
    file: File,
    customFileName?: string,
    durationSeconds?: number,
  ): Promise<UploadTranscriptionResponse> => {
    const request: UploadTranscriptionRequest = {
      fileName: customFileName?.trim() || file.name,
      fileSize: file.size,
    };

    const response = await api.post("/transcriptions/upload", request);
    const data = response.data as UploadTranscriptionResponse;

    const putResponse = await fetch(data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!putResponse.ok) {
      throw new Error("Error al subir el archivo a S3");
    }

    const confirmBody: { duration?: number } = {};
    if (typeof durationSeconds === "number" && durationSeconds >= 0) {
      confirmBody.duration = durationSeconds;
    }
    await api.post(`/transcriptions/${data.id}/confirm`, confirmBody);

    return data;
  },

  list: async (
    api: AxiosInstance,
    request: ListTranscriptionsRequest,
  ): Promise<ListTranscriptionsResponse> => {
    const { data } = await api.get("/transcriptions", {
      params: request,
    });
    return data;
  },

  getById: async (
    api: AxiosInstance,
    id: string,
  ): Promise<import("../types/transcription.types").Transcription> => {
    const { data } = await api.get(`/transcriptions/${id}`);
    return data;
  },

  getStats: async (
    api: AxiosInstance,
  ): Promise<TranscriptionStatsResponse> => {
    const { data } = await api.get<TranscriptionStatsResponse>(
      "/transcriptions/stats",
    );
    return data;
  },

  download: async (
    api: AxiosInstance,
    id: string,
    fileName: string,
  ): Promise<void> => {
    const { data } = await api.get(`/transcriptions/${id}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "") || "transcription"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/transcriptions/${id}`);
  },

  getRealtimeSession: async (
    api: AxiosInstance,
  ): Promise<RealtimeSessionResponse> => {
    const { data } = await api.post<RealtimeSessionResponse>(
      "/transcriptions/realtime",
    );
    return data;
  },

  saveRealtimeTranscription: async (
    api: AxiosInstance,
    transcriptionId: string,
    content: string,
    audioBlob: Blob,
    fileName: string,
    durationSeconds?: number,
  ): Promise<void> => {
    // Usamos JSON con base64 para evitar problemas con multipart en serverless-offline
    const audioBase64 = await blobToBase64(audioBlob);
    const body: { content: string; fileName: string; audioBase64: string; duration?: number } = {
      content,
      fileName,
      audioBase64,
    };
    if (typeof durationSeconds === "number" && durationSeconds >= 0) {
      body.duration = durationSeconds;
    }
    await api.post(`/transcriptions/realtime/${transcriptionId}/save`, body);
  },
};
