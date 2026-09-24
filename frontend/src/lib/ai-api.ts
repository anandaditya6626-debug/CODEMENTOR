import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api/v1' });

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface HintRequest {
  problem_id?: string;
  problem_title: string;
  problem_description: string;
  code: string;
  language: string;
  hint_level: number;
  previous_hints: string[];
}

export interface ExplainRequest {
  code: string;
  language: string;
  problem_context?: string;
  mode: 'beginner' | 'intermediate' | 'interview';
}

export interface DebugRequest {
  code: string;
  language: string;
  error_output: string;
  problem_context?: string;
}

export interface ComplexityResult {
  time_complexity: string;
  time_explanation: string;
  space_complexity: string;
  space_explanation: string;
  confidence: string;
  can_optimize?: boolean;
  optimization_hint?: string;
  type: string;
}

export interface EdgeCase {
  name: string;
  description: string;
  handled: boolean;
  severity: string;
}

export interface CodeReview {
  readability: { score: number; explanation: string };
  efficiency: { score: number; explanation: string };
  structure: { score: number; explanation: string };
  edge_cases: { score: number; explanation: string };
  overall: number;
  summary: string;
  suggestions?: string[];
  type: string;
}

export const aiApi = {
  getStatus: () => apiClient.get<{ available: boolean; provider: string | null }>('/ai/status'),
  getHint: (data: HintRequest) => apiClient.post<{ hint: string; level: number; type: string }>('/ai/hint', data),
  explainCode: (data: ExplainRequest) => apiClient.post<{ explanation: string; mode: string; type: string }>('/ai/explain', data),
  debugCode: (data: DebugRequest) => apiClient.post<{ analysis: string; type: string }>('/ai/debug', data),
  analyzeComplexity: (data: { code: string; language: string }) => apiClient.post<ComplexityResult>('/ai/complexity', data),
  detectEdgeCases: (data: { code: string; language: string; problem_description: string }) => apiClient.post<{ edge_cases: EdgeCase[]; type: string }>('/ai/edge-cases', data),
  reviewCode: (data: { code: string; language: string; problem_context?: string }) => apiClient.post<CodeReview>('/ai/review', data),
};
