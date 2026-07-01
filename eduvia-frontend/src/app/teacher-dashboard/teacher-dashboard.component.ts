import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { TeacherService } from '../teacher.service';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
})
export class TeacherDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  cards: Array<{ title: string; description: string; value: string | number; route: string }> = [
    {
      title: 'Courses',
      description: 'Manage course catalog and content.',
      value: '-',
      route: '/teacher/courses',
    },
    {
      title: 'Quizzes',
      description: 'Create quizzes and review attempts.',
      value: '-',
      route: '/teacher/quizzes',
    },
    {
      title: 'At-Risk Students',
      description: 'Track students needing teacher follow-up.',
      value: '-',
      route: '/teacher/progress',
    },
    {
      title: 'Sent Messages',
      description: 'Reminders and support communication.',
      value: '-',
      route: '/teacher/support',
    },
    {
      title: 'Knowledge Base',
      description: 'Manage course PDFs used by the AI tutor.',
      value: 'Manage',
      route: '/teacher/knowledge',
    },
  ];

  constructor(
    public authService: AuthService,
    private teacherService: TeacherService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherService
      .getCourses()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (courses) => {
          this.cards[0].value = courses.length;
        },
        error: () => {
          this.errorMessage = 'Could not load teacher dashboard summary.';
        },
      });

    this.teacherService.getQuizzes().subscribe({
      next: (quizzes) => {
        this.cards[1].value = quizzes.length;
      },
      error: () => {
        this.cards[1].value = '-';
      },
    });

    this.teacherService.getAtRiskStudents().subscribe({
      next: (students) => {
        this.cards[2].value = students.length;
      },
      error: () => {
        this.cards[2].value = '-';
      },
    });

    this.teacherService.getSentSupportMessages().subscribe({
      next: (messages) => {
        this.cards[3].value = messages.length;
      },
      error: () => {
        this.cards[3].value = '-';
      },
    });
  }

  openRoute(route: string): void {
    this.router.navigateByUrl(route);
  }
}
