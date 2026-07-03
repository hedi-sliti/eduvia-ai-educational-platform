import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3001';

export interface StudentProgress {
  studentId: string;
  assessmentCount: number;
  averageAssessmentScore: number | null;
  quizAttemptsCount: number;
  averageQuizScore: number | null;
  overallScore: number | null;
  riskLevel: string;
  needsAttention: boolean;
  latestAssessmentAt: string | null;
  latestQuizAttemptAt: string | null;
  recommendations: string[];
  weakTopics?: RevisionPlanItem[];
  lastComputedAt: string;
}

export interface QuizQuestion {
  prompt: string;
  options: string[];
  explanation?: string;
}

export interface QuizSummary {
  _id: string;
  title: string;
  description?: string;
  level?: string;
  subject?: string;
  isPublished: boolean;
  timeLimitMinutes?: number;
  questions: QuizQuestion[];
  createdAt?: string;
}

export interface QuizAttempt {
  _id: string;
  quizId: any;
  studentId: string;
  answers: number[];
  correctAnswers: number;
  totalQuestions: number;
  scorePercent: number;
  incorrectAnswers?: IncorrectAnswerItem[];
  weakTopics?: string[];
  revisionPlan?: RevisionPlanItem[];
  createdAt?: string;
}

export interface IncorrectAnswerItem {
  questionIndex: number;
  question: string;
  selectedOption: number;
  selectedAnswer: string;
  correctOption: number;
  correctAnswer: string;
  explanation?: string;
}

export interface RevisionPlanItem {
  weakConcept: string;
  reason: string;
  recommendedAction: string;
  relatedCourse: string;
  relatedPdf?: string;
  suggestedChatbotQuestion: string;
  priority: string;
}

export interface ReminderItem {
  _id: string;
  title?: string;
  message: string;
  priority: string;
  dueDate?: string;
  isRead: boolean;
  createdAt?: string;
}

export interface SupportMessageItem {
  _id: string;
  subject?: string;
  message: string;
  category?: string;
  isRead: boolean;
  createdAt?: string;
}

export interface ClubItem {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  memberCount: number;
  isFeatured: boolean;
  relevanceScore: number;
}

export interface EventItem {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  tags: string[];
  isFeatured: boolean;
  relevanceScore: number;
}

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  constructor(private http: HttpClient) {}

  getMyProgress(): Observable<StudentProgress> {
    return this.http.get<StudentProgress>(`${API_URL}/progress/my`);
  }

  getQuizzes(): Observable<QuizSummary[]> {
    return this.http.get<QuizSummary[]>(`${API_URL}/quizzes`);
  }

  getQuiz(id: string): Observable<QuizSummary> {
    return this.http.get<QuizSummary>(`${API_URL}/quizzes/${id}`);
  }

  submitQuizAttempt(id: string, answers: number[]): Observable<QuizAttempt> {
    return this.http.post<QuizAttempt>(`${API_URL}/quizzes/${id}/attempts`, {
      answers,
    });
  }

  getMyQuizAttempts(): Observable<QuizAttempt[]> {
    return this.http.get<QuizAttempt[]>(`${API_URL}/quizzes/my/attempts`);
  }

  getMyReminders(): Observable<ReminderItem[]> {
    return this.http.get<ReminderItem[]>(`${API_URL}/support/reminders/my`);
  }

  getMySupportMessages(): Observable<SupportMessageItem[]> {
    return this.http.get<SupportMessageItem[]>(`${API_URL}/support/messages/my`);
  }

  markReminderAsRead(id: string): Observable<ReminderItem> {
    return this.http.patch<ReminderItem>(`${API_URL}/support/reminders/${id}/read`, {});
  }

  markSupportMessageAsRead(id: string): Observable<SupportMessageItem> {
    return this.http.patch<SupportMessageItem>(`${API_URL}/support/messages/${id}/read`, {});
  }

  getClubs(): Observable<ClubItem[]> {
    return this.http.get<ClubItem[]>(`${API_URL}/community/clubs`);
  }

  getEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${API_URL}/community/events`);
  }

  getCommunityRecommendations(limit = 5): Observable<{ clubs: ClubItem[]; events: EventItem[] }> {
    return this.http.get<{ clubs: ClubItem[]; events: EventItem[] }>(
      `${API_URL}/community/recommendations?limit=${limit}`
    );
  }

  getLearningRecommendations(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/recommendations/my`);
  }
}
