import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { QuizAttempt, QuizSummary, RevisionPlanItem, StudentService } from '../student.service';

@Component({
  selector: 'app-student-quiz-attempt',
  templateUrl: './student-quiz-attempt.component.html',
  styleUrls: ['./student-quiz-attempt.component.css'],
})
export class StudentQuizAttemptComponent implements OnInit {
  quiz: QuizSummary | null = null;
  selectedAnswers: number[] = [];
  attemptResult: QuizAttempt | null = null;
  selectedSuggestedQuestion = '';
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (!quizId) {
      this.errorMessage = 'Quiz id is missing.';
      return;
    }

    this.loadQuiz(quizId);
  }

  loadQuiz(quizId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getQuiz(quizId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (quiz) => {
          this.quiz = quiz;
          this.selectedAnswers = new Array(quiz.questions.length).fill(-1);
        },
        error: () => {
          this.errorMessage = 'Could not load quiz. Please try again.';
        },
      });
  }

  selectAnswer(questionIndex: number, optionIndex: number): void {
    this.selectedAnswers[questionIndex] = optionIndex;
  }

  submitAttempt(): void {
    if (!this.quiz) {
      return;
    }

    if (this.selectedAnswers.some((answer) => answer < 0)) {
      this.errorMessage = 'Please answer all questions before submitting.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.attemptResult = null;
    this.selectedSuggestedQuestion = '';
    this.isSubmitting = true;

    this.studentService
      .submitQuizAttempt(this.quiz._id, this.selectedAnswers)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          this.attemptResult = result;
          this.successMessage = `Quiz submitted successfully. Score: ${result.scorePercent}% (${result.correctAnswers}/${result.totalQuestions})`;
        },
        error: () => {
          this.errorMessage = 'Failed to submit quiz attempt. Please try again.';
        },
      });
  }

  showSuggestedQuestion(item: RevisionPlanItem): void {
    this.selectedSuggestedQuestion = item.suggestedChatbotQuestion;
  }
}
