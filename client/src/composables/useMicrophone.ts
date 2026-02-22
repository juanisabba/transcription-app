/**
 * Composable para grabar audio del micrófono y transcribir en tiempo real
 * mediante Speechmatics WebSocket API.
 *
 * Usa Web Audio API para capturar PCM raw (pcm_s16le) y lo envía al WebSocket.
 * Speechmatics devuelve resultados parciales y finales en tiempo real.
 */

import { ref, readonly, onScopeDispose } from 'vue';
import { transcriptionService } from '../services/transcription.service';
import { useApi } from './useApi';

/** Formato de mensaje AddPartialTranscript / AddTranscript de Speechmatics */
interface SpeechmaticsTranscriptMessage {
  message: 'AddPartialTranscript' | 'AddTranscript';
  transcript?: string;
  results?: Array<{
    type: string;
    alternatives?: Array< { content: string } >;
  }>;
}

export interface UseMicrophoneOptions {
  /** Idioma para transcripción (código ISO, ej: "es", "en") */
  language?: string;
  /** Habilitar transcripciones parciales (más latencia pero feedback inmediato) */
  enablePartials?: boolean;
}

export function useMicrophone(options: UseMicrophoneOptions = {}) {
  const {
    language = 'es',
    enablePartials = true,
  } = options;

  // Estado público
  const isRecording = ref(false);
  const isPaused = ref(false);
  const transcript = ref('');
  const error = ref('');
  const isConnected = ref(false);
  const transcriptionId = ref<string | null>(null);
  const recordingStartedAt = ref<number | null>(null);
  const durationSeconds = ref(0);
  const audioLevel = ref(0);
  const recordedAudioBlob = ref<Blob | null>(null);

  // Estado interno para acumular final + parcial
  let finalTranscript = '';
  let lastPartial = '';

  // Estado interno
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let ws: WebSocket | null = null;
  let recognitionStarted = false;
  let lastSeqNo = 0;
  let sampleRate = 16000; // Speechmatics recomienda 16kHz para mejor rendimiento
  let durationInterval: ReturnType<typeof setInterval> | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  const audioChunks: Blob[] = [];

  onScopeDispose(() => {
    if (durationInterval) clearInterval(durationInterval);
  });

  /**
   * Obtiene token de sesión realtime del backend (requiere usuario autenticado).
   */
  async function connectToSpeechMatics(): Promise<void> {
    const api = useApi();
    const session = await transcriptionService.getRealtimeSession(api);

    transcriptionId.value = session.transcriptionId;
    const wsUrl = `${session.wsUrl}?jwt=${encodeURIComponent(session.token)}`;
    ws = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      let settled = false;
      let connectedSuccessfully = false;
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      const timeout = setTimeout(() => {
        if (!recognitionStarted) {
          disconnect('Timeout esperando RecognitionStarted');
          settle(() => reject(new Error('Timeout al conectar con Speechmatics')));
        }
      }, 10000);

      ws!.onopen = () => {
        isConnected.value = true;
        error.value = '';

        ws!.send(JSON.stringify({
          message: 'StartRecognition',
          audio_format: {
            type: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: sampleRate,
          },
          transcription_config: {
            language,
            enable_partials: enablePartials,
          },
        }));
      };

      ws!.onmessage = (event) => {
        if (typeof event.data === 'string') {
          onTranscriptionResult(event.data);
          const parsed = JSON.parse(event.data);
          if (parsed.message === 'RecognitionStarted') {
            recognitionStarted = true;
            connectedSuccessfully = true;
            clearTimeout(timeout);
            settle(() => resolve());
          }
        } else if (event.data instanceof Blob) {
          // AudioAdded no viene como string, los mensajes de transcripción sí
        }
      };

      ws!.onerror = () => {
        clearTimeout(timeout);
        error.value = 'Error de conexión WebSocket';
        disconnect();
        settle(() => reject(new Error('Error de conexión WebSocket')));
      };

      ws!.onclose = (event) => {
        clearTimeout(timeout);
        if (!connectedSuccessfully) {
          if (error.value === '') {
            error.value = event.reason || `Conexión cerrada: ${event.code}`;
          }
          disconnect();
          settle(() => reject(new Error(error.value)));
        }
      };
    });
  }

  function onTranscriptionResult(json: string): void {
    try {
      const msg = JSON.parse(json) as SpeechmaticsTranscriptMessage;
      if (msg.message === 'AddPartialTranscript' || msg.message === 'AddTranscript') {
        const text = msg.transcript ?? buildTranscriptFromResults(msg.results);
        if (text) {
          if (msg.message === 'AddTranscript') {
            finalTranscript = finalTranscript ? `${finalTranscript} ${text}`.trim() : text;
            lastPartial = '';
          } else {
            lastPartial = text;
          }
          transcript.value = finalTranscript ? `${finalTranscript} ${lastPartial}`.trim() : lastPartial;
        }
      }
    } catch {
      // Ignorar mensajes que no sean transcripción
    }
  }

  function buildTranscriptFromResults(results?: SpeechmaticsTranscriptMessage['results']): string {
    if (!results?.length) return '';
    return results
      .filter((r) => r.alternatives?.[0]?.content)
      .map((r) => r.alternatives![0].content)
      .join(' ');
  }

  function sendAudioChunk(pcmData: ArrayBuffer): void {
    if (ws?.readyState === WebSocket.OPEN && recognitionStarted) {
      ws.send(pcmData);
      lastSeqNo += 1;
    }
  }

  function disconnect(reason?: string): void {
    if (reason) {
      error.value = reason;
    }
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: 'EndOfStream', last_seq_no: lastSeqNo }));
      }
      ws.close();
      ws = null;
    }
    recognitionStarted = false;
    isConnected.value = false;
  }

  async function startRecording(): Promise<void> {
    error.value = '';
    transcript.value = '';
    finalTranscript = '';
    lastPartial = '';

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg.includes('Permission') || msg.includes('permission')) {
        error.value = 'Permiso de micrófono denegado. Permite el acceso al micrófono en la configuración del navegador.';
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        error.value = 'No se encontró ningún micrófono. Conecta un micrófono e inténtalo de nuevo.';
      } else if (msg.includes('NotAllowed') || msg.includes('denied')) {
        error.value = 'El acceso al micrófono fue denegado.';
      } else {
        error.value = `Error al acceder al micrófono: ${msg}`;
      }
      throw new Error(error.value);
    }

    audioContext = new AudioContext({ sampleRate: 16000 });
    sampleRate = audioContext.sampleRate;

    try {
      await connectToSpeechMatics();
    } catch (err) {
      mediaStream?.getTracks().forEach((t) => t.stop());
      audioContext?.close();
      throw err;
    }

    audioChunks.length = 0;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.start(1000);

    source = audioContext!.createMediaStreamSource(mediaStream);

    const bufferSize = 4096;
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      if (!isPaused.value) {
        const pcm16 = float32ToPcm16(input);
        sendAudioChunk(pcm16.buffer);
      }
      const rms = Math.sqrt(
        input.reduce((sum, s) => sum + s * s, 0) / input.length
      );
      audioLevel.value = Math.min(100, Math.round(rms * 400));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    recordingStartedAt.value = Date.now();
    durationSeconds.value = 0;
    isRecording.value = true;

    durationInterval = setInterval(() => {
      if (recordingStartedAt.value && isRecording.value) {
        durationSeconds.value = Math.floor(
          (Date.now() - recordingStartedAt.value) / 1000
        );
      }
    }, 1000);
  }

  function float32ToPcm16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  function stopRecording(): Promise<void> {
    return new Promise((resolve) => {
      const doCleanup = () => {
        if (processor) {
          processor.disconnect();
          processor = null;
        }
        if (source) {
          source.disconnect();
          source = null;
        }
        if (audioContext) {
          audioContext.close();
          audioContext = null;
        }
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
          mediaStream = null;
        }
        if (durationInterval) {
          clearInterval(durationInterval);
          durationInterval = null;
        }
        disconnect();
        isRecording.value = false;
        isPaused.value = false;
        recordingStartedAt.value = null;
        audioLevel.value = 0;
        resolve();
      };

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => {
          if (recordingStartedAt.value) {
            durationSeconds.value = Math.floor(
              (Date.now() - recordingStartedAt.value) / 1000,
            );
          }
          recordedAudioBlob.value =
            audioChunks.length > 0 ? new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' }) : null;
          mediaRecorder = null;
          doCleanup();
        };
        mediaRecorder.stop();
      } else {
        recordedAudioBlob.value = null;
        doCleanup();
      }
    });
  }

  function pauseRecording(): void {
    if (isRecording.value && !isPaused.value) {
      isPaused.value = true;
    }
  }

  function resumeRecording(): void {
    if (isRecording.value && isPaused.value) {
      isPaused.value = false;
    }
  }

  /**
   * Reinicia el estado de la sesión (transcripción, ID, audio, duración).
   * Usar después de guardar la transcripción para dejar el formulario listo
   * para una nueva grabación.
   */
  function resetSession(): void {
    transcript.value = '';
    transcriptionId.value = null;
    durationSeconds.value = 0;
    recordedAudioBlob.value = null;
    recordingStartedAt.value = null;
    finalTranscript = '';
    lastPartial = '';
    error.value = '';
  }

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetSession,
    isRecording: readonly(isRecording),
    isPaused: readonly(isPaused),
    transcript: readonly(transcript),
    error: readonly(error),
    isConnected: readonly(isConnected),
    transcriptionId: readonly(transcriptionId),
    durationSeconds: readonly(durationSeconds),
    audioLevel: readonly(audioLevel),
    recordedAudioBlob: readonly(recordedAudioBlob),
  };
}
