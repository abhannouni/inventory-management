import { api } from './client';
import type { Role } from '../types';

export type QuizAnswerMode = 'single' | 'multiple';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'missed';

export interface TrainingUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

export interface TrainingQuiz {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  answer_mode: QuizAnswerMode;
  duration_minutes: number;
  created_at: string;
}

export interface TrainingQuizListItem extends TrainingQuiz {
  question_count: number;
  assigned_count: number;
  completed_count: number;
}

export interface TrainingQuestion {
  id: string;
  position: number;
  text: string;
  options: { id: string; position: number; text: string; is_correct: boolean }[];
}

export interface TrainingAssignmentRow {
  id: string;
  user: TrainingUser;
  status: AssignmentStatus;
  assigned_at: string;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  total: number;
  leave_count: number;
  duration_seconds: number | null;
}

export interface TrainingQuizDetail {
  quiz: TrainingQuiz & { questions: TrainingQuestion[] };
  stats: {
    assigned: number;
    completed: number;
    in_progress: number;
    not_started: number;
    missed: number;
    average_score_pct: number | null;
  };
  question_stats: { question_id: string; correct_count: number; respondent_count: number }[];
  assignments: TrainingAssignmentRow[];
}

export interface TrainingAssignmentReview {
  id: string;
  user: TrainingUser;
  status: AssignmentStatus;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  total: number;
  leave_count: number;
  questions: {
    id: string;
    position: number;
    text: string;
    answered: boolean;
    is_correct: boolean;
    options: { id: string; text: string; is_correct: boolean; selected: boolean }[];
  }[];
}

export interface MyTrainingAssignment {
  id: string;
  status: AssignmentStatus;
  assigned_at: string;
  started_at: string | null;
  submitted_at: string | null;
  quiz: Omit<TrainingQuiz, 'created_at'> & { question_count: number };
}

export type QuizSession =
  | { finished: true }
  | {
      finished: false;
      assignment_id: string;
      title: string;
      answer_mode: QuizAnswerMode;
      duration_minutes: number;
      started_at: string;
      expires_at: string;
      server_now: string;
      questions: { id: string; text: string; options: { id: string; text: string }[] }[];
      answers: Record<string, string[]>;
    };

export interface CreateQuizPayload {
  title: string;
  description?: string;
  deadline: string;
  answer_mode: QuizAnswerMode;
  duration_minutes: number;
}

export interface QuizImportResult {
  quiz: TrainingQuiz | null;
  question_count: number;
  errors: { row: number; message: string }[];
}

export interface TrainingQuizExport extends TrainingQuiz {
  questions: TrainingQuestion[];
  assignments: (Omit<TrainingAssignmentRow, 'user'> & {
    user: TrainingUser;
    answers: Record<string, { option_ids: string[]; is_correct: boolean }>;
  })[];
}

export const trainingApi = {
  // Taking a quiz
  listMine: () => api.get<MyTrainingAssignment[]>('/training/my'),
  start: (assignmentId: string) => api.post<QuizSession>(`/training/my/${assignmentId}/start`),
  saveAnswer: (assignmentId: string, questionId: string, optionIds: string[]) =>
    api.put<{ saved: boolean }>(`/training/my/${assignmentId}/answers`, { question_id: questionId, option_ids: optionIds }),
  submit: (assignmentId: string, leaveCount: number) =>
    api.post<{ submitted: boolean }>(`/training/my/${assignmentId}/submit`, { leave_count: leaveCount }),

  // Super Admin
  listQuizzes: () => api.get<TrainingQuizListItem[]>('/training/quizzes'),
  getQuiz: (id: string) => api.get<TrainingQuizDetail>(`/training/quizzes/${id}`),
  importQuiz: (payload: CreateQuizPayload, file: File) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== '') formData.append(k, String(v));
    });
    formData.append('file', file);
    return api.upload<QuizImportResult>('/training/quizzes/import', formData);
  },
  updateQuiz: (id: string, payload: Partial<Omit<CreateQuizPayload, 'answer_mode'>>) =>
    api.patch<TrainingQuiz>(`/training/quizzes/${id}`, payload),
  removeQuiz: (id: string) => api.delete<void>(`/training/quizzes/${id}`),
  assignableUsers: () => api.get<TrainingUser[]>('/training/assignable-users'),
  assign: (id: string, userIds: string[]) =>
    api.post<{ assigned: number; skipped: number }>(`/training/quizzes/${id}/assign`, { user_ids: userIds }),
  exportResults: (quizIds: string[]) =>
    api.get<TrainingQuizExport[]>('/training/quizzes/export', { quiz_ids: quizIds.join(',') }),
  unassign: (assignmentId: string) => api.delete<void>(`/training/assignments/${assignmentId}`),
  reviewAssignment: (assignmentId: string) => api.get<TrainingAssignmentReview>(`/training/assignments/${assignmentId}`),
};
