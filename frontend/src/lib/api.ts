import axios from 'axios';
import { User, Profile, Problem, ProblemListItem, Topic, Submission, UserStats, Achievement, Notification, Bookmark, Note } from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user?: User;
  token?: string;
}

export const auth = {
  login: async (data: any) => api.post<AuthResponse>('/auth/login', data),
  signup: async (data: any) => api.post<AuthResponse>('/auth/signup', data),
  forgotPassword: async (data: any) => api.post('/auth/forgot-password', data),
  resetPassword: async (data: any) => api.post('/auth/reset-password', data),
  getMe: async () => api.get<User>('/auth/me'),
};

export const users = {
  getProfile: async () => api.get<Profile>('/users/profile'),
  updateProfile: async (data: Partial<Profile>) => api.put<Profile>('/users/profile', data),
  saveOnboarding: async (data: any) => api.post('/users/onboarding', data),
  getStats: async () => api.get<UserStats>('/users/stats'),
  getAchievements: async () => api.get<Achievement[]>('/users/achievements'),
  getNotifications: async () => api.get<Notification[]>('/users/notifications'),
};

export const problems = {
  getProblems: async (params?: any) => api.get<{items: ProblemListItem[], total: number}>('/problems', { params }),
  getProblem: async (slug: string) => api.get<Problem>(`/problems/${slug}`),
  getTopics: async () => api.get<Topic[]>('/topics'),
  getDailyChallenge: async () => api.get<Problem>('/problems/daily-challenge'),
  getRecommended: async () => api.get<ProblemListItem[]>('/problems/recommended'),
};

export const submissions = {
  runCode: async (data: any) => api.post<Submission>('/submissions/run', data),
  submitCode: async (data: any) => api.post<Submission>('/submissions/submit', data),
  getSubmissionHistory: async (problemId: string) => api.get<Submission[]>(`/problems/${problemId}/submissions`),
  getSubmission: async (id: string) => api.get<Submission>(`/submissions/${id}`),
};

export const bookmarks = {
  getBookmarks: async () => api.get<Bookmark[]>('/bookmarks'),
  createBookmark: async (data: any) => api.post<Bookmark>('/bookmarks', data),
  deleteBookmark: async (id: string) => api.delete(`/bookmarks/${id}`),
};

export const notes = {
  getNotes: async () => api.get<Note[]>('/notes'),
  getProblemNotes: async (problemId: string) => api.get<Note[]>(`/problems/${problemId}/notes`),
  createNote: async (data: any) => api.post<Note>('/notes', data),
  updateNote: async (id: string, data: any) => api.put<Note>(`/notes/${id}`, data),
  deleteNote: async (id: string) => api.delete(`/notes/${id}`),
};

export interface RuntimeMetadata {
  id: string;
  name: string;
  ext: string;
  filename: string;
  badge_color: string;
  default_code: string;
  available: boolean;
  provider: string;
  version: string;
  reason: string;
}

export const execution = {
  checkHealth: async () => api.get<{ status: string; service: string }>('/health'),
  getRuntimes: async () =>
    api.get<{
      judge0_enabled: boolean;
      languages: RuntimeMetadata[];
    }>('/execute/runtimes'),
  execute: async (data: { code: string; language: string; stdin?: string; time_limit?: number }) =>
    api.post<{
      status: string;
      stdout: string;
      stderr: string;
      compile_output: string;
      time: string | null;
      memory: number | null;
      error: string;
      exit_code: number | null;
    }>('/execute/', data),
};

export default api;

