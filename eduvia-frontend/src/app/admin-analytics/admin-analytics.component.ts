import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css'],
})
export class AdminAnalyticsComponent implements OnInit {
  overview: any = null;
  usersAnalytics: any = null;
  learningAnalytics: any = null;
  engagementAnalytics: any = null;

  isLoading = false;
  errorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAllAnalytics();
  }

  loadAllAnalytics(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService
      .getAnalyticsOverview()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.overview = data;
        },
        error: () => {
          this.errorMessage = 'Could not load analytics overview.';
        },
      });

    this.adminService.getAnalyticsUsers().subscribe({
      next: (data) => {
        this.usersAnalytics = data;
      },
      error: () => {
        this.usersAnalytics = null;
      },
    });

    this.adminService.getAnalyticsLearning().subscribe({
      next: (data) => {
        this.learningAnalytics = data;
      },
      error: () => {
        this.learningAnalytics = null;
      },
    });

    this.adminService.getAnalyticsEngagement().subscribe({
      next: (data) => {
        this.engagementAnalytics = data;
      },
      error: () => {
        this.engagementAnalytics = null;
      },
    });
  }
}
