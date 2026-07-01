import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { TeacherService } from '../teacher.service';

@Component({
  selector: 'app-teacher-support',
  templateUrl: './teacher-support.component.html',
  styleUrls: ['./teacher-support.component.css'],
})
export class TeacherSupportComponent implements OnInit {
  sentReminders: any[] = [];
  sentMessages: any[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  reminderForm = {
    studentId: '',
    title: 'Follow-up Reminder',
    message: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    dueDate: '',
  };

  supportForm = {
    studentId: '',
    subject: 'Support Message',
    message: '',
    category: 'general',
  };

  constructor(private teacherService: TeacherService) {}

  ngOnInit(): void {
    this.loadSentItems();
  }

  loadSentItems(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherService
      .getSentReminders()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.sentReminders = items;
        },
        error: () => {
          this.errorMessage = 'Could not load sent reminders.';
        },
      });

    this.teacherService.getSentSupportMessages().subscribe({
      next: (items) => {
        this.sentMessages = items;
      },
      error: () => {
        this.sentMessages = [];
      },
    });
  }

  sendReminder(): void {
    if (!this.reminderForm.studentId.trim() || !this.reminderForm.message.trim()) {
      this.errorMessage = 'studentId and message are required for reminders.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.teacherService
      .createReminder({
        ...this.reminderForm,
        dueDate: this.reminderForm.dueDate || undefined,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Reminder sent successfully.';
          this.reminderForm.message = '';
          this.loadSentItems();
        },
        error: () => {
          this.errorMessage = 'Failed to send reminder.';
        },
      });
  }

  sendSupportMessage(): void {
    if (!this.supportForm.studentId.trim() || !this.supportForm.message.trim()) {
      this.errorMessage = 'studentId and message are required for support messages.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.teacherService.createSupportMessage(this.supportForm).subscribe({
      next: () => {
        this.successMessage = 'Support message sent successfully.';
        this.supportForm.message = '';
        this.loadSentItems();
      },
      error: () => {
        this.errorMessage = 'Failed to send support message.';
      },
    });
  }
}
