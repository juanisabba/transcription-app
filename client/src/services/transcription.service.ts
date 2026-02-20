import type { AxiosInstance } from "axios";
import type {
  UploadTranscriptionRequest,
  UploadTranscriptionResponse,
  ListTranscriptionsRequest,
  ListTranscriptionsResponse,
  DownloadTranscriptionResponse,
} from "../types/transcription.types";

export const transcriptionService = {
  upload: async (
    api: AxiosInstance,
    request: UploadTranscriptionRequest,
  ): Promise<UploadTranscriptionResponse> => {
    console.log("API call: POST /transcriptions/upload");
    const { data } = await api.post("/transcriptions/upload", request);
    return data;
  },

  uploadWithConfirmation: async (
    api: AxiosInstance,
    file: File,
  ): Promise<UploadTranscriptionResponse> => {
    const request: UploadTranscriptionRequest = {
      fileName: file.name,
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

    await api.post(`/transcriptions/${data.id}/confirm`);

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

  download: async (
    api: AxiosInstance,
    id: string,
  ): Promise<DownloadTranscriptionResponse> => {
    const { data } = await api.get(`/transcriptions/${id}/download`);
    return data;
  },

  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/transcriptions/${id}`);
  },
};
