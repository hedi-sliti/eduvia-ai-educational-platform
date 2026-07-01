import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { CourseItem, QuizItem, TeacherService } from '../teacher.service';

@Component({
  selector: 'app-teacher-quizzes',
  templateUrl: './teacher-quizzes.component.html',
  styleUrls: ['./teacher-quizzes.component.css'],
})
export class TeacherQuizzesComponent implements OnInit {
  quizzes: QuizItem[] = [];
  courses: CourseItem[] = [];
  selectedQuizAttempts: any[] = [];
  selectedQuizTitle = '';
  isLoading = false;
  isSaving = false;
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
}
