import { transcriptionService } from '../services/transcription.service';
import type { UploadTranscriptionRequest } from '../types/transcription.types';
import { useApi } from './useApi';

export const useTranscription = () => {
  const transcriptionStore = useTranscriptionStore();
  const uiStore = useUiStore();

  const upload = async (request: UploadTranscriptionRequest) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.upload(api, request);
      transcriptionStore.addTranscription({
        id: response.id,
        fileName: request.fileName,
        status: response.status,
        createdAt: new Date().toISOString(),
      });
      uiStore.setSuccess('Transcripción iniciada');
      return response;
    } catch (error: any) {
      uiStore.setError(error.response?.data?.message || 'Error al subir archivo');
      throw error;
    } finally {
      uiStore.setLoading(false);
    }
  };

  const uploadWithConfirmation = async (file: File) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.uploadWithConfirmation(api, file);
      transcriptionStore.addTranscription({
        id: response.id,
        fileName: file.name,
        status: response.status,
        createdAt: new Date().toISOString(),
      });
      uiStore.setSuccess('Archivo subido exitosamente');
      return response;
    } catch (error: any) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (error as Error)?.message ||
        'Error al subir archivo';
      uiStore.setError(message);
      throw error;
    } finally {
      uiStore.setLoading(false);
    }
  };

  const list = async (page: number = 1, pageSize: number = 10) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.list(api, { page, pageSize });
      transcriptionStore.setTranscriptions(response);
    } catch (error: any) {
      uiStore.setError('Error al cargar historial');
    } finally {
      uiStore.setLoading(false);
    }
  };

  const download = async (id: string) => {
    const api = useApi();
    try {
      const response = await transcriptionService.download(api, id);
      window.open(response.downloadUrl, '_blank');
    } catch (error: any) {
      uiStore.setError('Error al descargar');
    }
  };

  const remove = async (id: string) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      await transcriptionService.delete(api, id);
      transcriptionStore.removeTranscription(id);
      uiStore.setSuccess('Transcripción eliminada');
    } catch (error: any) {
      uiStore.setError('Error al eliminar');
    } finally {
      uiStore.setLoading(false);
    }
  };

  return { upload, uploadWithConfirmation, list, download, remove };
};
