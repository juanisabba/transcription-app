import { transcriptionService } from '../services/transcription.service';
import type { UploadTranscriptionRequest } from '../types/transcription.types';
import { getApiErrorMessage } from '../utils/errorUtils';
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
        type: 'batch',
        createdAt: new Date().toISOString(),
      });
      uiStore.setSuccess('Transcripción iniciada');
      return response;
    } catch (error: unknown) {
      uiStore.setError(getApiErrorMessage(error, 'Error al subir archivo'));
      throw error;
    } finally {
      uiStore.setLoading(false);
    }
  };

  const uploadWithConfirmation = async (file: File, customFileName?: string, durationSeconds?: number) => {
    const api = useApi();
    const fileName = customFileName?.trim() || file.name;
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.uploadWithConfirmation(api, file, fileName, durationSeconds);
      transcriptionStore.addTranscription({
        id: response.id,
        fileName,
        status: response.status,
        type: 'batch',
        duration: typeof durationSeconds === 'number' && durationSeconds >= 0 ? durationSeconds : undefined,
        createdAt: new Date().toISOString(),
      });
      uiStore.setSuccess('Archivo subido exitosamente');
      return response;
    } catch (error: unknown) {
      uiStore.setError(getApiErrorMessage(error, 'Error al subir archivo'));
      throw error;
    } finally {
      uiStore.setLoading(false);
    }
  };

  const list = async (page: number = 1, pageSize: number = 10) => {
    const cached = transcriptionStore.getCachedPageData(page);
    if (cached) {
      transcriptionStore.setTranscriptions({
        items: cached.items,
        currentPage: page,
        totalPages: cached.totalPages,
        hasMore: cached.hasMore,
      });
      return;
    }
    const api = useApi();
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.list(api, { page, pageSize });
      transcriptionStore.setTranscriptions(response);
    } catch (error: unknown) {
      uiStore.setError('Error al cargar historial');
    } finally {
      uiStore.setLoading(false);
    }
  };

  /** Para useAsyncData: fetchea una página y devuelve la respuesta. Evita API si hay cache fresco (<5min). */
  const fetchPage = async (
    page: number,
    pageSize: number = 10,
  ): Promise<{
    items: import('../types/transcription.types').Transcription[];
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  }> => {
    const cached = transcriptionStore.getCachedPageData(page);
    if (cached) {
      transcriptionStore.setTranscriptions({
        items: cached.items,
        currentPage: page,
        totalPages: cached.totalPages,
        hasMore: cached.hasMore,
      });
      return {
        items: cached.items,
        currentPage: page,
        totalPages: cached.totalPages,
        hasMore: cached.hasMore,
      };
    }
    const api = useApi();
    try {
      uiStore.setLoading(true);
      const response = await transcriptionService.list(api, { page, pageSize });
      transcriptionStore.setTranscriptions(response);
      return response;
    } finally {
      uiStore.setLoading(false);
    }
  };

  const getStats = async () => {
    const api = useApi();
    return transcriptionService.getStats(api);
  };

  const download = async (id: string, fileName: string) => {
    const api = useApi();
    try {
      await transcriptionService.download(api, id, fileName);
    } catch (error: unknown) {
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
      // Si la página actual quedó vacía y hay páginas anteriores, volver a cargar la anterior
      if (
        transcriptionStore.transcriptions.length === 0 &&
        transcriptionStore.currentPage > 1
      ) {
        await list(transcriptionStore.currentPage - 1);
      }
    } catch (error: unknown) {
      uiStore.setError('Error al eliminar');
    } finally {
      uiStore.setLoading(false);
    }
  };

  const saveRealtime = async (
    transcriptionId: string,
    content: string,
    audioBlob: Blob,
    fileName: string,
    durationSeconds?: number,
  ): Promise<void> => {
    const api = useApi();
    const name = fileName?.trim() || 'Tiempo Real';
    try {
      uiStore.setLoading(true);
      await transcriptionService.saveRealtimeTranscription(
        api,
        transcriptionId,
        content,
        audioBlob,
        name,
        durationSeconds,
      );
      transcriptionStore.addTranscription({
        id: transcriptionId,
        fileName: name,
        status: 'completed',
        type: 'realtime',
        content,
        duration: typeof durationSeconds === 'number' && durationSeconds >= 0 ? durationSeconds : undefined,
        createdAt: new Date().toISOString(),
      });
      uiStore.setSuccess('Transcripción guardada');
    } catch (error: unknown) {
      uiStore.setError(
        getApiErrorMessage(error, 'Error al guardar transcripción'),
      );
      throw error;
    } finally {
      uiStore.setLoading(false);
    }
  };

  return {
    upload,
    uploadWithConfirmation,
    list,
    fetchPage,
    getStats,
    download,
    remove,
    saveRealtime,
  };
};
