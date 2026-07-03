import { Component, OnInit } from '@angular/core';
import { ChatbotService } from '../chatbot.service';
import { finalize } from 'rxjs';
import { CourseItem, TeacherService } from '../teacher.service';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.component.html',
  styleUrls: ['./knowledge.component.css']
})
export class KnowledgeComponent implements OnInit {
  documents: any[] = [];
  courses: CourseItem[] = [];
  isLoading = false;
  isUploading = false;
  isDeleting = false;
  isLoadingCourses = false;
  errorMessage = '';
  successMessage = '';
  selectedFile: File | null = null;
  title = '';
  level = '';
  subjects = '';
  selectedCourseId = '';

  constructor(
    private chatbotService: ChatbotService,
    private teacherService: TeacherService,
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.loadDocuments();
  }

  get selectedCourseTitle(): string {
    const selectedCourse = this.courses.find((course) => course._id === this.selectedCourseId);
    return selectedCourse?.title || '';
  }

  get groupedDocuments(): Array<{ courseLabel: string; docs: any[] }> {
    const groups = new Map<string, any[]>();
    for (const doc of this.documents) {
      const label = doc?.metadata?.course_title || 'Unassigned Course';
      const bucket = groups.get(label) || [];
      bucket.push(doc);
      groups.set(label, bucket);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([courseLabel, docs]) => ({ courseLabel, docs }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedFile = file;
  }

  uploadDocument(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a PDF file.';
      return;
    }

    if (!this.selectedCourseId) {
      this.errorMessage = 'Please select a course before uploading.';
      return;
    }

    const subjects = this.subjects
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => !!subject);

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.chatbotService
      .uploadPdf(
        this.selectedFile,
        this.title,
        this.level,
        subjects,
        this.selectedCourseId,
        this.selectedCourseTitle,
      )
      .pipe(finalize(() => (this.isUploading = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'PDF uploaded and indexed successfully.';
          this.selectedFile = null;
          this.title = '';
          this.level = '';
          this.subjects = '';
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Error uploading PDF:', err);
          this.errorMessage = this.extractUploadErrorMessage(err);
        }
      });
  }

  deleteDocument(documentId: string): void {
    if (!documentId) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.chatbotService
      .deletePdfDocument(documentId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Document deleted successfully.';
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Error deleting document:', err);
          this.errorMessage = 'Could not delete document right now.';
        }
      });
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.chatbotService.getPdfDocuments().subscribe({
      next: (data) => {
        this.documents = data.documents || [];
        if (!this.successMessage) {
          this.successMessage = this.documents.length > 0
            ? `Loaded ${this.documents.length} document(s).`
            : 'Knowledge base is ready. Upload PDFs to build tutor context.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading documents:', err);
        this.errorMessage = 'Could not load documents right now. Please verify backend and AI services, then try again.';
        this.isLoading = false;
      }
    });
  }

  private loadCourses(): void {
    this.isLoadingCourses = true;
    this.teacherService
      .getCourses()
      .pipe(finalize(() => (this.isLoadingCourses = false)))
      .subscribe({
        next: (courses) => {
          this.courses = courses || [];
          if (this.courses.length && !this.selectedCourseId) {
            this.selectedCourseId = this.courses[0]._id;
          }
        },
        error: (err) => {
          console.error('Error loading courses for knowledge upload:', err);
          this.errorMessage = 'Could not load courses for document upload.';
        },
      });
  }

  private extractUploadErrorMessage(err: any): string {
    const backend = err?.error;
    const message =
      backend?.message ||
      backend?.detail ||
      backend?.error ||
      err?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return 'Upload failed. Please check the file and try again.';
  }
}
