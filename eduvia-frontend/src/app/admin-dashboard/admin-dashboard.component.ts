import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  cards: Array<{ title: string; description: string; value: string | number; route: string }> = [
    {
      title: 'Users',
      description: 'Manage accounts and roles.',
      value: '-',
      route: '/admin/users',
    },
    {
      title: 'Courses',
      description: 'Total available courses.',
      value: '-',
      route: '/admin/analytics',
    },
    {
      title: 'Quiz Attempts',
      description: 'Learning activity volume.',
      value: '-',
      route: '/admin/analytics',
    },
    {
      title: 'Analytics',
      description: 'Overview, users, learning, engagement.',
      value: 'Live',
      route: '/admin/analytics',
    },
  ];

  constructor(
    public authService: AuthService,
    private adminService: AdminService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService
      .getAnalyticsOverview()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.cards[0].value = data?.counts?.users ?? '-';
          this.cards[1].value = data?.counts?.courses ?? '-';
          this.cards[2].value = data?.counts?.quizAttempts ?? '-';
        },
        error: () => {
          this.errorMessage = 'Could not load admin dashboard summary.';
        },
      });
  }

  openRoute(route: string): void {
    this.router.navigateByUrl(route);
  }
}
