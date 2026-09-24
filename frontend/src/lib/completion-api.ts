import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
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

export interface InlineCompletionRequest {
  code: string;
  language: string;
  cursor_line: number;
  cursor_col: number;
  file_context?: string;
  request_id?: string;
}

export interface InlineCompletionResponse {
  suggestion: string;
  type: 'line' | 'block';
  request_id?: string;
}

export interface DiffPreview {
  original_line: string;
  fixed_line: string;
}

export interface ErrorExplainRequest {
  code: string;
  language: string;
  error: string;
  line?: number;
}

export interface ErrorExplainResponse {
  error_type?: string;
  line?: number;
  column?: number;
  symbol?: string;
  problem?: string;
  why_it_happened?: string;
  how_to_fix?: string;
  code_snippet?: string;
  diff_preview?: DiffPreview;
  explanation: string;
  cause: string;
  fix: string;
  fixed_code: string;
  confidence: 'high' | 'medium' | 'low';
  suggestions?: string[];
  is_logical?: boolean;
}

export interface LogicalLintResponse {
  has_issues: boolean;
  issues: ErrorExplainResponse[];
}

export interface LintDiagnosticItem {
  line: number;
  column: number;
  end_line?: number;
  end_column?: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  suggestion?: string;
  fix_code?: string;
}

export interface LintResponse {
  valid: boolean;
  diagnostics: LintDiagnosticItem[];
}

export const completionApi = {
  getStatus: () =>
    apiClient.get<{ available: boolean; provider: string | null }>('/completion/status'),

  getInlineCompletion: (data: InlineCompletionRequest) =>
    apiClient.post<InlineCompletionResponse>('/completion/inline', data),

  explainError: (data: ErrorExplainRequest) =>
    apiClient.post<ErrorExplainResponse>('/completion/error-explain', data),

  lint: (data: { code: string; language: string }) =>
    apiClient.post<LintResponse>('/completion/lint', data),

  checkLogicalErrors: (data: { code: string; language: string }) =>
    apiClient.post<LogicalLintResponse>('/completion/logical-lint', data),
};
