import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class ChatbotService {
  private pythonAiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {
    let baseUrl = this.configService.get<string>('PYTHON_AI_URL') || 'http://localhost:8000/api';
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (!baseUrl.endsWith('/api')) {
      baseUrl = `${baseUrl}/api`;
    }
    this.pythonAiUrl = baseUrl;
  }

  async sendChatMessage(message: string, studentId?: string, sessionId?: string, level?: string, subjects?: string[], courseId?: string, courseTitle?: string) {
    try {
      console.log('Dispatching chat request to Python AI URL:', `${this.pythonAiUrl}/chat/`, { message, student_id: studentId, session_id: sessionId, course_id: courseId });
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/chat/`, {
          message,
          student_id: studentId,
          session_id: sessionId,
          level,
          subjects,
          course_id: courseId,
          course_title: courseTitle,
        })
      );
      console.log('Python chat response', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to send chat message raw error:', error);
      console.error('Failed to send chat message response body:', error?.response?.data);
      console.error('Failed to send chat message response status:', error?.response?.status);

      if (error?.response?.data) {
        const status = error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        throw new HttpException(error.response.data, status);
      }

      const message = error?.message || 'Failed to send chat message';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async uploadPdf(file: Buffer, filename: string, title?: string, source?: string, level?: string, subjects?: string[], courseId?: string, courseTitle?: string) {
    try {
      const formData = new FormData();
      formData.append('file', file, {
        filename,
        contentType: 'application/pdf',
      });
      if (title) formData.append('title', title);
      if (source) formData.append('source', source);
      if (level) formData.append('level', level);
      if (courseId) formData.append('courseId', courseId);
      if (courseTitle) formData.append('courseTitle', courseTitle);
      const normalizedSubjects = this.normalizeSubjects(subjects);
      if (normalizedSubjects.length > 0) {
        normalizedSubjects.forEach((subject) => {
          formData.append('subjects', subject);
        });
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/pdf/upload`, formData, {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })
      );
      return response.data;
    } catch (error: any) {
      const upstreamStatus = error?.response?.status;
      const upstreamData = error?.response?.data;
      const safeMessage =
        upstreamData?.detail ||
        upstreamData?.message ||
        upstreamData?.error ||
        error?.message ||
        'Failed to upload PDF';

      console.error('Failed to upload PDF through API:', upstreamData || error?.message || error);

      if (upstreamData) {
        throw new HttpException(
          {
            message: safeMessage,
            detail: upstreamData?.detail,
            error: upstreamData?.error,
          },
          upstreamStatus || HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        { message: safeMessage },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async chatWithPdfs(message: string, studentId?: string, sessionId?: string, courseId?: string, courseTitle?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/pdf/chat`, {
          message,
          student_id: studentId,
          session_id: sessionId,
          course_id: courseId,
          course_title: courseTitle,
        })
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to chat with PDFs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPdfDocuments() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonAiUrl}/pdf/documents`)
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to get PDF documents',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deletePdfDocument(documentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.pythonAiUrl}/pdf/documents/${documentId}`)
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to delete PDF document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async ingestKnowledge(text: string, metadata?: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/knowledge/ingest/raw`, {
          text,
          metadata,
        })
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'ingesting knowledge');
    }
  }

  async listKnowledgeDocuments() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonAiUrl}/knowledge/documents`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'listing knowledge documents');
    }
  }

  async getKnowledgeDocument(documentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonAiUrl}/knowledge/documents/${documentId}`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'getting knowledge document');
    }
  }

  async deleteKnowledgeDocument(documentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.pythonAiUrl}/knowledge/documents/${documentId}`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'deleting knowledge document');
    }
  }

  async updateKnowledgeDocument(documentId: string, payload: { title?: string; level?: string; subjects?: string[]; text?: string; file?: any }) {
    try {
      const { title, level, subjects, text, file } = payload;
      let body: any;
      let headers: any = {};

      if (file) {
        const formData = new FormData();
        formData.append('file', file.buffer, { filename: file.originalname, contentType: 'application/pdf' });
        if (title) formData.append('title', title);
        if (level) formData.append('level', level);
        if (subjects) {
          subjects.forEach((s) => formData.append('subjects', s));
        }
        if (text) formData.append('text', text);
        body = formData;
        headers = formData.getHeaders();
      } else {
        const formData = new FormData();
        if (title) formData.append('title', title);
        if (level) formData.append('level', level);
        if (subjects) subjects.forEach((s) => formData.append('subjects', s));
        if (text) formData.append('text', text);
        body = formData;
        headers = formData.getHeaders();
      }

      const response = await firstValueFrom(
        this.httpService.put(`${this.pythonAiUrl}/knowledge/documents/${documentId}`, body, { headers })
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'updating knowledge document');
    }
  }

  async analyzeAssessment(answers: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/assessment/`, {
          answers,
        })
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'analyzing assessment');
    }
  }

  // Session management methods
  async createSession(studentId: string, title?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/sessions/`, {
          student_id: studentId,
          title,
        })
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'creating session');
    }
  }

  async getUserSessions(studentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonAiUrl}/sessions/`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'getting user sessions');
    }
  }

  async getSessionHistory(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonAiUrl}/sessions/${sessionId}/history`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'getting session history');
    }
  }

  async updateSessionTitle(sessionId: string, title: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.pythonAiUrl}/sessions/${sessionId}/title`, {
          title,
        })
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'updating session title');
    }
  }

  async deleteSession(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.pythonAiUrl}/sessions/${sessionId}`)
      );
      return response.data;
    } catch (error) {
      this.handlePythonError(error, 'deleting session');
    }
  }

  private getHealthUrl(): string {
    const baseUrl = this.pythonAiUrl.replace(/\/+$/, '');

    // Prefer the direct /health endpoint on the Python service.
    // If PYTHON_AI_URL is set to http://localhost:8000/api, this becomes http://localhost:8000/health.
    if (baseUrl.endsWith('/api')) {
      return baseUrl.slice(0, -4) + '/health';
    }

    return baseUrl + '/health';
  }

  async healthCheck() {
    try {
      const healthUrl = this.getHealthUrl();
      const response = await firstValueFrom(
        this.httpService.get(healthUrl)
      );
      return { status: 'ok', python_api: response.data };
    } catch (error) {
      // Retry against /api/health when fallback is needed
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.pythonAiUrl.replace(/\/+$/, '')}/health`)
        );
        return { status: 'ok', python_api: response.data };
      } catch (err) {
        throw new HttpException(
          'Failed to retrieve Python API health status',
          HttpStatus.BAD_GATEWAY,
        );
      }
    }
  }

  private handlePythonError(error: any, action: string) {
    console.error(`Error ${action}:`, error?.response?.data || error.message);
    if (error?.response?.data) {
      const status = error?.response?.status || HttpStatus.BAD_GATEWAY;
      throw new HttpException(error.response.data, status);
    }
    throw new HttpException(
      `AI Service Error: Failed while ${action}. Python server might be unreachable.`,
      HttpStatus.BAD_GATEWAY
    );
  }

  private normalizeSubjects(subjects?: string[] | string): string[] {
    if (!subjects) {
      return [];
    }
    if (Array.isArray(subjects)) {
      return subjects.map((subject) => subject?.trim()).filter((subject) => !!subject) as string[];
    }
    return subjects
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => !!subject);
  }
}
