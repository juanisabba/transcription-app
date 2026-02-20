export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}
