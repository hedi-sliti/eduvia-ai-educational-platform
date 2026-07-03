import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://localhost:3001/chatbot';

  constructor(private http: HttpClient) { }

  sendMessage(message: string, courseId?: string, courseTitle?: string): Observable<any> {
    const payload: any = { message };
    if (courseId?.trim()) {
      payload.courseId = courseId.trim();
    }
    if (courseTitle?.trim()) {
      payload.courseTitle = courseTitle.trim();
    }
    return this.http.post(`${this.apiUrl}/chat`, payload);
  }

  getDocuments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/knowledge/documents`);
  }

  getPdfDocuments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/pdf/documents`);
  }

  uploadPdf(
    file: File,
    title?: string,
    level?: string,
    subjects?: string[],
    courseId?: string,
    courseTitle?: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (title?.trim()) {
      formData.append('title', title.trim());
    }
    if (level?.trim()) {
      formData.append('level', level.trim());
    }
    if (subjects?.length) {
      subjects
        .map((subject) => subject.trim())
        .filter((subject) => !!subject)
        .forEach((subject) => formData.append('subjects', subject));
    }
    if (courseId?.trim()) {
      formData.append('courseId', courseId.trim());
    }
    if (courseTitle?.trim()) {
      formData.append('courseTitle', courseTitle.trim());
    }
    return this.http.post(`${this.apiUrl}/pdf/upload`, formData);
  }

  deletePdfDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pdf/documents/${documentId}`);
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}
