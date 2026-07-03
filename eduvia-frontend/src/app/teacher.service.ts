import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3001';

export interface CourseItem {
  _id: string;
  title: string;
  description?: string;
  subject?: string;
  level?: string;
  contentUrl?: string;
}

export interface QuizQuestionInput {
  prompt: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

export interface QuizItem {
  _id: string;
  title: string;
  description?: string;
  courseId: any;
  level?: string;
  subject?: string;
  isPublished: boolean;
  timeLimitMinutes?: number;
  questions: QuizQuestionInput[];
}

export interface PdfDocumentItem {
  id: string;
  title: string;
  document_id: string;
  metadata: {
    original_filename?: string;
    course_id?: string;
    course_title?: string;
    level?: string;
    subjects?: string[];
  };
  created_at?: string;
}

export interface GeneratedQuizResponse {
  courseId: string;
  courseTitle: string;
  documentId: string;
  documentTitle: string;
  questions: QuizQuestionInput[];
}

export interface AtRiskStudentItem {
  student: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  progress: {
    overallScore: number | null;
    riskLevel: string;
    needsAttention: boolean;
    assessmentCount: number;
    quizAttemptsCount: number;
  };
}

export interface ReminderInput {
  studentId: string;
  title?: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
}

export interface SupportMessageInput {
  studentId: string;
  subject?: string;
  message: string;
  category?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  constructor(private http: HttpClient) {}

  getCourses(): Observable<CourseItem[]> {
    return this.http.get<CourseItem[]>(`${API_URL}/courses`);
  }

  createCourse(payload: Partial<CourseItem>): Observable<CourseItem> {
    return this.http.post<CourseItem>(`${API_URL}/courses`, payload);
  }

  updateCourse(id: string, payload: Partial<CourseItem>): Observable<CourseItem> {
    return this.http.patch<CourseItem>(`${API_URL}/courses/${id}`, payload);
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/courses/${id}`);
  }

  getQuizzes(): Observable<QuizItem[]> {
    return this.http.get<QuizItem[]>(`${API_URL}/quizzes`);
  }

  createQuiz(payload: any): Observable<QuizItem> {
    return this.http.post<QuizItem>(`${API_URL}/quizzes`, payload);
  }

  getPdfDocuments(): Observable<{ documents: PdfDocumentItem[]; count: number }> {
    return this.http.get<{ documents: PdfDocumentItem[]; count: number }>(`${API_URL}/chatbot/pdf/documents`);
  }

  generateQuizFromPdf(payload: {
    courseId: string;
    documentId: string;
    numberOfQuestions?: number;
  }): Observable<GeneratedQuizResponse> {
    return this.http.post<GeneratedQuizResponse>(`${API_URL}/chatbot/pdf/generate-quiz`, payload);
  }

  getQuizAttempts(quizId: string): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/quizzes/${quizId}/attempts`);
  }

  getAtRiskStudents(): Observable<AtRiskStudentItem[]> {
    return this.http.get<AtRiskStudentItem[]>(`${API_URL}/progress/at-risk`);
  }

  getStudentProgress(studentId: string): Observable<any> {
    return this.http.get<any>(`${API_URL}/progress/student/${studentId}`);
  }

  createReminder(payload: ReminderInput): Observable<any> {
    return this.http.post<any>(`${API_URL}/support/reminders`, payload);
  }

  getSentReminders(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/support/reminders/sent`);
  }

  createSupportMessage(payload: SupportMessageInput): Observable<any> {
    return this.http.post<any>(`${API_URL}/support/messages`, payload);
  }

  getSentSupportMessages(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/support/messages/sent`);
  }
}
