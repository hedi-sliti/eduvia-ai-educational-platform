import { Controller, Post, Body, HttpCode, HttpStatus, Get, Put, Delete, Param, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatbotService } from './chatbot.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) { }

  private normalizeSubjects(subjects?: string | string[]): string[] | undefined {
    if (!subjects) {
      return undefined;
    }
    if (Array.isArray(subjects)) {
      return subjects.map((subject) => subject?.trim()).filter((subject) => !!subject) as string[];
    }
    return subjects
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => !!subject);
  }

  @Post('chat')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: { message: string; studentId?: string; sessionId?: string; level?: string; subjects?: string[]; courseId?: string; courseTitle?: string }) {
    if (!body.message) {
      return { error: 'Message payload is required' };
    }
    return this.chatbotService.sendChatMessage(
      body.message,
      body.studentId,
      body.sessionId,
      body.level,
      body.subjects,
      body.courseId,
      body.courseTitle,
    );
  }

  @Post('ingest')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async ingest(@Body() body: { text: string; metadata?: any }) {
    return this.chatbotService.ingestKnowledge(body.text, body.metadata);
  }

  // Knowledge CRUD
  @Get('knowledge/documents')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async listKnowledge() {
    return this.chatbotService.listKnowledgeDocuments();
  }

  @Get('knowledge/documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getKnowledge(@Param('documentId') documentId: string) {
    return this.chatbotService.getKnowledgeDocument(documentId);
  }

  @Delete('knowledge/documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteKnowledge(@Param('documentId') documentId: string) {
    return this.chatbotService.deleteKnowledgeDocument(documentId);
  }

  @Put('knowledge/documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async updateKnowledge(
    @Param('documentId') documentId: string,
    @UploadedFile() file: any,
    @Body() body: { title?: string; level?: string; subjects?: string | string[]; text?: string },
  ) {
    return this.chatbotService.updateKnowledgeDocument(documentId, {
      file,
      title: body.title,
      level: body.level,
      subjects: this.normalizeSubjects(body.subjects),
      text: body.text,
    });
  }

  @Post('assess')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async assess(@Body() body: { answers: any }) {
    return this.chatbotService.analyzeAssessment(body.answers);
  }

  // Session management endpoints
  @Post('sessions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() body: { studentId: string; title?: string }) {
    return this.chatbotService.createSession(body.studentId, body.title);
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async getSessions() {
    return this.chatbotService.getUserSessions('current-user'); // In real app, get from auth
  }

  @Get('sessions/:sessionId/history')
  @UseGuards(AuthGuard)
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    return this.chatbotService.getSessionHistory(sessionId);
  }

  @Put('sessions/:sessionId/title')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateSessionTitle(
    @Param('sessionId') sessionId: string,
    @Body() body: { title: string }
  ) {
    return this.chatbotService.updateSessionTitle(sessionId, body.title);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteSession(@Param('sessionId') sessionId: string) {
    return this.chatbotService.deleteSession(sessionId);
  }

  @Get('health')
  async health() {
    return this.chatbotService.healthCheck();
  }

  // PDF endpoints
  @Post('pdf/upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadPdf(
    @UploadedFile() file: any,
    @Body() body: { title?: string; source?: string; level?: string; subjects?: string | string[]; courseId?: string; courseTitle?: string }
  ) {
    if (!file) {
      return { error: 'PDF file is required' };
    }
    return this.chatbotService.uploadPdf(
      file.buffer,
      file.originalname,
      body.title,
      body.source,
      body.level,
      this.normalizeSubjects(body.subjects),
      body.courseId,
      body.courseTitle,
    );
  }

  @Post('pdf/chat')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async chatWithPdfs(@Body() body: { message: string; studentId?: string; sessionId?: string; courseId?: string; courseTitle?: string }) {
    if (!body.message) {
      return { error: 'Message is required' };
    }
    return this.chatbotService.chatWithPdfs(body.message, body.studentId, body.sessionId, body.courseId, body.courseTitle);
  }

  @Get('pdf/documents')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getPdfDocuments() {
    return this.chatbotService.getPdfDocuments();
  }

  @Delete('pdf/documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deletePdfDocument(@Param('documentId') documentId: string) {
    return this.chatbotService.deletePdfDocument(documentId);
  }
}
