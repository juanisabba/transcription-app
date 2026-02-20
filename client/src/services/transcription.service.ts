import type { AxiosInstance } from 'axios';
import type {
  UploadTranscriptionRequest,
  UploadTranscriptionResponse,
  ListTranscriptionsRequest,
  ListTranscriptionsResponse,
  DownloadTranscriptionResponse,
} from '../types/transcription.types';

export const transcriptionService = {
  upload: async (
    api: AxiosInstance,
    request: UploadTranscriptionRequest,
  ): Promise<UploadTranscriptionResponse> => {
    const { data } = await api.post('/transcriptions/upload', request);
    return data;
  },

  list: async (
    api: AxiosInstance,
    request: ListTranscriptionsRequest,
  ): Promise<ListTranscriptionsResponse> => {
    const { data } = await api.get('/transcriptions', {
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
