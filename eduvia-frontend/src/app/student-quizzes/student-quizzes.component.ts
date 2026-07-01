import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { QuizAttempt, QuizSummary, StudentService } from '../student.service';

@Component({
  selector: 'app-student-quizzes',
  templateUrl: './student-quizzes.component.html',
  styleUrls: ['./student-quizzes.component.css'],
})
export class StudentQuizzesComponent implements OnInit {
  quizzes: QuizSummary[] = [];
  attempts: QuizAttempt[] = [];
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
      .getQuizzes()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.quizzes = data;
          this.loadAttempts();
        },
        error: () => {
          this.errorMessage = 'Could not load quizzes. Please try again.';
        },
      });
  }

  loadAttempts(): void {
    this.studentService.getMyQuizAttempts().subscribe({
      next: (data) => {
        this.attempts = data;
      },
      error: () => {
        this.attempts = [];
      },
    });
  }

  getLatestScore(quizId: string): number | null {
    const quizAttempts = this.attempts.filter((item) => {
      const id = typeof item.quizId === 'string' ? item.quizId : item.quizId?._id;
      return id === quizId;
    });

    if (!quizAttempts.length) {
      return null;
    }

    return quizAttempts[0].scorePercent;
  }
}
