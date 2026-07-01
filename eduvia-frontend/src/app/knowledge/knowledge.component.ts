import { Component, OnInit } from '@angular/core';
import { ChatbotService } from '../chatbot.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.component.html',
  styleUrls: ['./knowledge.component.css']
})
export class KnowledgeComponent implements OnInit {
  documents: any[] = [];
  isLoading = false;
  isUploading = false;
  isDeleting = false;
  errorMessage = '';
  successMessage = '';
  selectedFile: File | null = null;
  title = '';
  level = '';
  subjects = '';

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.loadDocuments();
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

    const subjects = this.subjects
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => !!subject);

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.chatbotService
      .uploadPdf(this.selectedFile, this.title, this.level, subjects)
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
