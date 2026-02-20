export interface Transcription {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadTranscriptionRequest {
  fileName: string;
  fileSize: number;
}

export interface UploadTranscriptionResponse {
  id: string;
  uploadUrl: string;
  status: 'pending';
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
