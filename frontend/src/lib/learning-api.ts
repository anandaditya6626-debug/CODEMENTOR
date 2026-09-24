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

export interface SkillNode {
  id: string;
  name: string;
  slug: string;
  icon: string;
  problem_count: number;
  problems_solved: number;
  problems_attempted: number;
  accuracy: number;
  confidence: number;
  last_practiced: string | null;
  status: 'not_started' | 'learning' | 'proficient' | 'mastered';
}

export interface SkillEdge {
  from: string;
  to: string;
}

export interface RoadmapStage {
  name: string;
  description: string;
  topics: SkillNode[];
  status: 'active' | 'upcoming' | 'locked' | 'completed';
}

export interface BugPattern {
  id: string;
  bug_type: string;
  occurrences: number;
  last_occurred: string | null;
  description: string;
  category: string;
}

export interface CodeVersionEntry {
  id: string;
  version_number: number;
  code: string;
  language: string;
  change_description: string;
  time_complexity: string | null;
  space_complexity: string | null;
  test_results_snapshot: any;
  created_at: string | null;
}

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  difficulty: string;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  topics_practiced: string[];
  problems_solved_ids: string[];
  mistakes_made: Record<string, any>;
  improvements: Record<string, any>;
  auto_summary: string | null;
  user_notes: string | null;
  created_at: string | null;
}

export const learningApi = {
  getSkillGraph: () => apiClient.get<{ nodes: SkillNode[]; edges: SkillEdge[] }>('/learning/skill-graph'),
  getRoadmap: () => apiClient.get<{ stages: RoadmapStage[]; overall_progress: number; total_topics: number; completed_topics: number }>('/learning/roadmap'),
  getAdaptiveProblem: (topicSlug: string) => apiClient.get<any>(`/learning/adaptive-problem/${topicSlug}`),
  getBugPatterns: () => apiClient.get<BugPattern[]>('/learning/bug-patterns'),
  getCodeVersions: (problemId: string) => apiClient.get<CodeVersionEntry[]>(`/learning/code-versions/${problemId}`),
  saveCodeVersion: (data: { problem_id: string; code: string; language: string; description: string }) => apiClient.post('/learning/code-versions', data),
  getDailyChallenge: () => apiClient.get<DailyChallenge>('/learning/daily-challenge'),
  getJournalEntries: () => apiClient.get<JournalEntry[]>('/learning/journal'),
  saveJournalNote: (data: { entry_date: string; notes: string }) => apiClient.post('/learning/journal', data),
  checkAchievements: () => apiClient.post<any[]>('/learning/check-achievements'),
};
