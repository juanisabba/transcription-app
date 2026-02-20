import type { AxiosInstance } from 'axios';
import api from '../services/api';

export const useApi = (): AxiosInstance => {
  return api;
};
