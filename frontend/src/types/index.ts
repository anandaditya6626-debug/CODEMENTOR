export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  bio?: string;
  preparing_for: string[];
  skill_level: string;
  preferred_languages: string[];
  daily_target_minutes: number;
  problems_solved: number;
  current_streak: number;
  longest_streak: number;
  total_time_spent_minutes: number;
  accuracy_percentage: number;
  learning_progress: number;
  last_active_date?: string;
  is_public: boolean;
  show_on_leaderboard: boolean;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  problem_count: number;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examples: ProblemExample[];
  constraints: string[];
  hints: string[];
  expected_time_complexity?: string;
  expected_space_complexity?: string;
  starter_code: Record<string, string>;
  solution_code?: Record<string, string>;
  pattern_tags: string[];
  topics: Topic[];
  total_submissions: number;
  accepted_submissions: number;
  is_solved?: boolean;
  is_bookmarked?: boolean;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemListItem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  acceptance_rate: number;
  is_solved: boolean;
}

export interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
}

export interface Submission {
  id: string;
  problem_id: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  is_run: boolean;
  runtime_ms?: number;
  memory_kb?: number;
  total_test_cases: number;
  passed_test_cases: number;
  compiler_output?: string;
  error_output?: string;
  results: SubmissionResult[];
  created_at: string;
}

export type SubmissionStatus = 
  | 'pending' | 'running' | 'accepted' | 'wrong_answer'
  | 'time_limit_exceeded' | 'memory_limit_exceeded'
  | 'runtime_error' | 'compilation_error';

export interface SubmissionResult {
  test_case_id: string;
  status: string;
  actual_output?: string;
  expected_output?: string;
  runtime_ms?: number;
  memory_kb?: number;
}

export interface UserStats {
  problems_solved: number;
  current_streak: number;
  longest_streak?: number;
  accuracy_percentage: number;
  learning_progress: number;
  problems_attempted?: number;
  total_time_spent_minutes?: number;
}

export interface TopicProgress {
  topic_name: string;
  topic_slug: string;
  problems_attempted: number;
  problems_solved: number;
  accuracy: number;
  confidence: number;
}

export interface Bookmark {
  id: string;
  problem_id?: string;
  bookmark_type: string;
  title: string;
  content?: string;
  created_at: string;
  problem?: ProblemListItem;
}

export interface Note {
  id: string;
  problem_id?: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export type Language =
  | 'python'
  | 'cpp'
  | 'c'
  | 'java'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'sql'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'kotlin'
  | 'swift';

export const LANGUAGES: { value: Language; label: string; monacoId: string }[] = [
  { value: 'python', label: 'Python 3', monacoId: 'python' },
  { value: 'html', label: 'HTML5', monacoId: 'html' },
  { value: 'css', label: 'CSS3', monacoId: 'css' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
  { value: 'c', label: 'C', monacoId: 'c' },
  { value: 'java', label: 'Java', monacoId: 'java' },
  { value: 'sql', label: 'SQL', monacoId: 'sql' },
  { value: 'csharp', label: 'C#', monacoId: 'csharp' },
  { value: 'go', label: 'Go', monacoId: 'go' },
  { value: 'rust', label: 'Rust', monacoId: 'rust' },
  { value: 'php', label: 'PHP', monacoId: 'php' },
  { value: 'ruby', label: 'Ruby', monacoId: 'ruby' },
  { value: 'kotlin', label: 'Kotlin', monacoId: 'kotlin' },
  { value: 'swift', label: 'Swift', monacoId: 'swift' },
];

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
