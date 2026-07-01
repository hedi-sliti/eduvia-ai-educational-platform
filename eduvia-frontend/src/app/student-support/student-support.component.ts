import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ReminderItem, StudentService, SupportMessageItem } from '../student.service';

@Component({
  selector: 'app-student-support',
  templateUrl: './student-support.component.html',
  styleUrls: ['./student-support.component.css'],
})
export class StudentSupportComponent implements OnInit {
  reminders: ReminderItem[] = [];
  messages: SupportMessageItem[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getMyReminders()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.reminders = data;
          this.loadMessages();
        },
        error: () => {
          this.errorMessage = 'Could not load reminders/messages. Please try again.';
        },
      });
  }

  loadMessages(): void {
    this.studentService.getMySupportMessages().subscribe({
      next: (data) => {
        this.messages = data;
      },
      error: () => {
        this.messages = [];
      },
    });
  }

  markReminderAsRead(id: string): void {
    this.studentService.markReminderAsRead(id).subscribe({
      next: () => {
        this.reminders = this.reminders.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        );
      },
      error: () => {
        this.errorMessage = 'Failed to mark reminder as read.';
      },
    });
  }

  markMessageAsRead(id: string): void {
    this.studentService.markSupportMessageAsRead(id).subscribe({
      next: () => {
        this.messages = this.messages.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        );
      },
      error: () => {
        this.errorMessage = 'Failed to mark message as read.';
      },
    });
  }
}
