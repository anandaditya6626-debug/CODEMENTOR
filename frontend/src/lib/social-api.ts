import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url?: string;
  problems_solved: number;
  accuracy: number;
  streak: number;
  score: number;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  is_active: boolean;
  problem_ids: string[];
  participant_count?: number;
}

export interface ContestParticipation {
  user_id: string;
  username: string;
  score: number;
  problems_solved: number;
  total_time_seconds: number;
  rank: number;
}

export interface InterviewSession {
  id: string;
  session_type: 'DSA' | 'System Design' | 'Behavioral';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  company_style: string;
  status: 'active' | 'completed';
  conversation: InterviewMessage[];
  final_feedback?: string;
  score?: number;
  duration_seconds: number;
  started_at: string;
  completed_at?: string;
}

export interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

export const socialApi = {
  getLeaderboard: async (timeframe: 'all_time' | 'monthly' | 'weekly' = 'all_time', limit = 50) => {
    const { data } = await api.get<LeaderboardEntry[]>('/leaderboard', { params: { timeframe, limit } });
    return data;
  },

  getContests: async (status?: 'upcoming' | 'active' | 'past') => {
    const { data } = await api.get<Contest[]>('/contests', { params: { status } });
    return data;
  },

  getContestLeaderboard: async (contestId: string) => {
    const { data } = await api.get<ContestParticipation[]>(`/contests/${contestId}/leaderboard`);
    return data;
  },

  joinContest: async (contestId: string) => {
    const { data } = await api.post(`/contests/${contestId}/join`);
    return data;
  },

  startInterview: async (options: { session_type: string; difficulty: string; company_style: string }) => {
    const { data } = await api.post<InterviewSession>('/interviews/start', options);
    return data;
  },

  sendInterviewMessage: async (sessionId: string, payload: { message: string; code?: string }) => {
    const { data } = await api.post<InterviewSession>(`/interviews/${sessionId}/messages`, payload);
    return data;
  },

  endInterview: async (sessionId: string) => {
    const { data } = await api.post<InterviewSession>(`/interviews/${sessionId}/end`);
    return data;
  },

  getInterviewHistory: async () => {
    const { data } = await api.get<InterviewSession[]>('/interviews/history');
    return data;
  },

  getInterview: async (sessionId: string) => {
    const { data } = await api.get<InterviewSession>(`/interviews/${sessionId}`);
    return data;
  }
};
