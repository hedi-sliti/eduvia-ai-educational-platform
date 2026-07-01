import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { StudentService } from '../student.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
})
export class StudentDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  summary = {
    overallScore: null as number | null,
    riskLevel: 'NO_DATA',
    quizCount: 0,
    reminderCount: 0,
    supportMessageCount: 0,
    clubCount: 0,
    eventCount: 0,
  };

  cards = [
    {
      title: 'Chatbot',
      description: 'Open the live AI tutor for instant explanations and revision support.',
      route: '/chat',
      kind: 'route' as const,
    },
    {
      title: 'Progress',
      description: 'Track assessment and quiz performance with your current risk level.',
      route: '/student/progress',
      kind: 'route' as const,
    },
    {
      title: 'Quizzes',
      description: 'Review available quizzes and submit attempts from real backend data.',
      route: '/student/quizzes',
      kind: 'route' as const,
    },
    {
      title: 'Recommendations',
      description: 'See your learning and community recommendations in one place.',
      route: '/student/recommendations',
      kind: 'route' as const,
    },
    {
      title: 'Reminders & Support',
      description: 'Read reminders and support messages sent by teacher/admin.',
      route: '/student/support',
      kind: 'route' as const,
    },
    {
      title: 'Clubs & Events',
      description: 'Explore community clubs and upcoming learning events.',
      route: '/student/community',
      kind: 'route' as const,
    },
  ];

  constructor(
    public authService: AuthService,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getMyProgress()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (progress) => {
          this.summary.overallScore = progress.overallScore;
          this.summary.riskLevel = progress.riskLevel;
          this.summary.quizCount = progress.quizAttemptsCount;
          this.loadSecondarySummary();
        },
        error: () => {
          this.errorMessage = 'Could not load dashboard summary.';
        },
      });
  }

  private loadSecondarySummary(): void {
    this.studentService.getMyReminders().subscribe({
      next: (items) => {
        this.summary.reminderCount = items.length;
      },
    });

    this.studentService.getMySupportMessages().subscribe({
      next: (items) => {
        this.summary.supportMessageCount = items.length;
      },
    });

    this.studentService.getClubs().subscribe({
      next: (items) => {
        this.summary.clubCount = items.length;
      },
    });

    this.studentService.getEvents().subscribe({
      next: (items) => {
        this.summary.eventCount = items.length;
      },
    });
  }
}
