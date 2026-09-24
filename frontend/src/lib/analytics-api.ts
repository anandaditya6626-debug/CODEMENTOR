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

export interface OverviewStats {
  problems_solved: number;
  current_streak: number;
  longest_streak: number;
  accuracy: number;
  total_submissions: number;
  accepted_submissions: number;
  acceptance_rate: number;
  total_time_spent_minutes: number;
  by_difficulty: { easy: number; medium: number; hard: number };
  languages: { language: string; count: number }[];
  learning_progress: number;
}

export interface SubmissionTrend {
  date: string;
  total: number;
  accepted: number;
}

export interface TopicRadar {
  topic: string;
  accuracy: number;
  confidence: number;
  problems_solved: number;
  problems_attempted: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  weekday: number;
  week: number;
}

export interface MonthlyProgress {
  month: string;
  problems_solved: number;
  submissions: number;
}

export interface DifficultyDist {
  easy: { solved: number; total: number };
  medium: { solved: number; total: number };
  hard: { solved: number; total: number };
}

export interface RecentActivity {
  id: string;
  problem_title: string;
  problem_slug: string;
  difficulty: string;
  language: string;
  status: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  created_at: string | null;
}

export const analyticsApi = {
  getOverview: () => apiClient.get<OverviewStats>('/analytics/overview'),
  getSubmissionTrends: (days?: number) => apiClient.get<SubmissionTrend[]>(`/analytics/submission-trends${days ? `?days=${days}` : ''}`),
  getTopicRadar: () => apiClient.get<TopicRadar[]>('/analytics/topic-radar'),
  getActivityHeatmap: (weeks?: number) => apiClient.get<HeatmapDay[]>(`/analytics/activity-heatmap${weeks ? `?weeks=${weeks}` : ''}`),
  getProgress: (months?: number) => apiClient.get<MonthlyProgress[]>(`/analytics/progress${months ? `?months=${months}` : ''}`),
  getDifficultyDist: () => apiClient.get<DifficultyDist>('/analytics/difficulty-distribution'),
  getRecentActivity: (limit?: number) => apiClient.get<RecentActivity[]>(`/analytics/recent-activity${limit ? `?limit=${limit}` : ''}`),
};
