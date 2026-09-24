import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface ExecutionStep {
  step: number;
  line: number;
  event: string;
  func: string;
  variables: Record<string, string>;
  stdout: string;
}

export interface TraceResponse {
  status: 'success' | 'error' | 'timeout' | 'step_limit' | 'empty';
  steps: ExecutionStep[];
  total_steps: number;
  error?: string | null;
  stdout?: string | null;
}

export const replayApi = {
  trace: (code: string, language: string = 'python') =>
    apiClient.post<TraceResponse>('/replay/trace', { code, language }),
};
