import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import {
  CourseItem,
  PdfDocumentItem,
  QuizItem,
  QuizQuestionInput,
  TeacherService,
} from '../teacher.service';

@Component({
  selector: 'app-teacher-quizzes',
  templateUrl: './teacher-quizzes.component.html',
  styleUrls: ['./teacher-quizzes.component.css'],
})
export class TeacherQuizzesComponent implements OnInit {
  quizzes: QuizItem[] = [];
  courses: CourseItem[] = [];
  pdfDocuments: PdfDocumentItem[] = [];
  generatedQuestions: QuizQuestionInput[] = [];
  selectedQuizAttempts: any[] = [];
  selectedQuizTitle = '';
  selectedDocumentId = '';
  isLoading = false;
  isSaving = false;
  isGenerating = false;
  errorMessage = '';
  successMessage = '';

  form = {
    title: '',
    description: '',
    courseId: '',
    level: 'Beginner',
    subject: '',
    timeLimitMinutes: 10,
    prompt: '',
    optionA: '',
    optionB: '',
    optionC: '',
    correctOption: 0,
    explanation: '',
  };

  constructor(private teacherService: TeacherService) {}

  get filteredDocuments(): PdfDocumentItem[] {
    if (!this.form.courseId) {
      return this.pdfDocuments;
    }

    return this.pdfDocuments.filter((doc) => doc.metadata?.course_id === this.form.courseId);
  }

  ngOnInit(): void {
    this.loadInitial();
  }

  loadInitial(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherService
      .getCourses()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          if (courses.length && !this.form.courseId) {
            this.form.courseId = courses[0]._id;
          }
          this.loadPdfDocuments();
          this.loadQuizzes();
        },
        error: () => {
          this.errorMessage = 'Could not load courses for quiz creation.';
        },
      });
  }

  loadQuizzes(): void {
    this.teacherService.getQuizzes().subscribe({
      next: (items) => {
        this.quizzes = items;
      },
      error: () => {
        this.quizzes = [];
      },
    });
  }

  loadPdfDocuments(): void {
    this.teacherService.getPdfDocuments().subscribe({
      next: (data) => {
        this.pdfDocuments = data.documents || [];
        if (!this.selectedDocumentId && this.filteredDocuments.length) {
          this.selectedDocumentId = this.filteredDocuments[0].document_id;
        }
      },
      error: () => {
        this.pdfDocuments = [];
      },
    });
  }

  onCourseChanged(): void {
    this.selectedDocumentId = this.filteredDocuments[0]?.document_id || '';
  }

  createQuiz(): void {
    if (!this.form.title.trim() || !this.form.courseId || !this.form.prompt.trim()) {
      this.errorMessage = 'Title, course, and first question are required.';
      return;
    }

    if (!this.form.optionA.trim() || !this.form.optionB.trim()) {
      this.errorMessage = 'At least two options are required for the question.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    const payload = {
      title: this.form.title,
      description: this.form.description,
      courseId: this.form.courseId,
      level: this.form.level,
      subject: this.form.subject,
      isPublished: true,
      timeLimitMinutes: Number(this.form.timeLimitMinutes),
      questions: [
        {
          prompt: this.form.prompt,
          options: [this.form.optionA, this.form.optionB, this.form.optionC].filter((o) => !!o.trim()),
          correctOption: Number(this.form.correctOption),
          explanation: this.form.explanation,
        },
      ],
    };

    this.teacherService
      .createQuiz(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Quiz created successfully.';
          this.resetForm();
          this.loadQuizzes();
        },
        error: () => {
          this.errorMessage = 'Failed to create quiz.';
        },
      });
  }

  generateQuizFromPdf(): void {
    if (!this.form.courseId || !this.selectedDocumentId) {
      this.errorMessage = 'Select a course PDF before generating a quiz.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.generatedQuestions = [];
    this.isGenerating = true;

    this.teacherService
      .generateQuizFromPdf({
        courseId: this.form.courseId,
        documentId: this.selectedDocumentId,
        numberOfQuestions: 5,
      })
      .pipe(finalize(() => (this.isGenerating = false)))
      .subscribe({
        next: (result) => {
          this.generatedQuestions = (result.questions || []).map((question) => ({
            prompt: question.prompt,
            options: this.ensureFourOptions(question.options),
            correctOption: Number(question.correctOption || 0),
            explanation: question.explanation || '',
          }));
          this.form.title = `${result.documentTitle} Quiz`;
          this.form.description = `AI-generated quiz from ${result.documentTitle}.`;
          this.successMessage = 'Quiz generated. Review and edit before saving.';
        },
        error: (err) => {
          console.error('Error generating quiz:', err);
          this.errorMessage = err?.error?.detail || err?.error?.message || 'Could not generate quiz from the selected PDF.';
        },
      });
  }

  saveGeneratedQuiz(): void {
    if (!this.form.title.trim() || !this.form.courseId || !this.generatedQuestions.length) {
      this.errorMessage = 'Generated quiz title, course, and questions are required.';
      return;
    }

    const invalidQuestion = this.generatedQuestions.some((question) => {
      const options = this.ensureFourOptions(question.options);
      return !question.prompt.trim() || options.some((option) => !option.trim());
    });
    if (invalidQuestion) {
      this.errorMessage = 'Each generated question needs text and four options.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    const payload = {
      title: this.form.title,
      description: this.form.description,
      courseId: this.form.courseId,
      level: this.form.level,
      subject: this.form.subject,
      isPublished: true,
      timeLimitMinutes: Number(this.form.timeLimitMinutes),
      questions: this.generatedQuestions.map((question) => ({
        prompt: question.prompt,
        options: this.ensureFourOptions(question.options),
        correctOption: Number(question.correctOption),
        explanation: question.explanation,
      })),
    };

    this.teacherService
      .createQuiz(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Generated quiz saved successfully.';
          this.generatedQuestions = [];
          this.resetForm();
          this.loadQuizzes();
        },
        error: () => {
          this.errorMessage = 'Failed to save generated quiz.';
        },
      });
  }

  viewAttempts(quiz: QuizItem): void {
    this.selectedQuizTitle = quiz.title;
    this.teacherService.getQuizAttempts(quiz._id).subscribe({
      next: (attempts) => {
        this.selectedQuizAttempts = attempts;
      },
      error: () => {
        this.selectedQuizAttempts = [];
      },
    });
  }

  resetForm(): void {
    this.form.title = '';
    this.form.description = '';
    this.form.level = 'Beginner';
    this.form.subject = '';
    this.form.timeLimitMinutes = 10;
    this.form.prompt = '';
    this.form.optionA = '';
    this.form.optionB = '';
    this.form.optionC = '';
    this.form.correctOption = 0;
    this.form.explanation = '';
  }

  private ensureFourOptions(options: string[]): string[] {
    const normalized = [...(options || [])].slice(0, 4);
    while (normalized.length < 4) {
      normalized.push('');
    }
    return normalized;
  }
}
