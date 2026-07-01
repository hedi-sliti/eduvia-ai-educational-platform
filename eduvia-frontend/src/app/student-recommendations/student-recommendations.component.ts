import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ClubItem, EventItem, StudentService } from '../student.service';

@Component({
  selector: 'app-student-recommendations',
  templateUrl: './student-recommendations.component.html',
  styleUrls: ['./student-recommendations.component.css'],
})
export class StudentRecommendationsComponent implements OnInit {
  learningRecommendations: Array<{ title: string; description?: string; type?: string; priority?: number }> = [];
  communityClubs: ClubItem[] = [];
  communityEvents: EventItem[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getLearningRecommendations()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.learningRecommendations = items || [];
          this.loadCommunityRecommendations();
        },
        error: () => {
          this.errorMessage = 'Could not load recommendations right now.';
        },
      });
  }

  loadCommunityRecommendations(): void {
    this.studentService.getCommunityRecommendations(5).subscribe({
      next: (data) => {
        this.communityClubs = data.clubs || [];
        this.communityEvents = data.events || [];
      },
      error: () => {
        this.communityClubs = [];
        this.communityEvents = [];
      },
    });
  }
}
