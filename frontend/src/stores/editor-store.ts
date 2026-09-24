import { create } from 'zustand';
import { Language, Submission } from '@/types';

interface EditorState {
  language: Language;
  code: Record<string, string>;
  isRunning: boolean;
  isSubmitting: boolean;
  output: string;
  submission: Submission | null;
  fontSize: number;
  setLanguage: (lang: Language) => void;
  setCode: (lang: string, newCode: string) => void;
  setRunning: (running: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setOutput: (output: string) => void;
  setSubmission: (sub: Submission | null) => void;
  resetCode: () => void;
  setFontSize: (size: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  language: 'python',
  code: {},
  isRunning: false,
  isSubmitting: false,
  output: '',
  submission: null,
  fontSize: 14,
  setLanguage: (language) => set({ language }),
  setCode: (lang, newCode) => set((state) => ({ code: { ...state.code, [lang]: newCode } })),
  setRunning: (isRunning) => set({ isRunning }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setOutput: (output) => set({ output }),
  setSubmission: (submission) => set({ submission }),
  resetCode: () => set({ code: {}, output: '', submission: null }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
