import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ClubItem, EventItem, StudentService } from '../student.service';

@Component({
  selector: 'app-student-community',
  templateUrl: './student-community.component.html',
  styleUrls: ['./student-community.component.css'],
})
export class StudentCommunityComponent implements OnInit {
  clubs: ClubItem[] = [];
  events: EventItem[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadCommunity();
  }

  loadCommunity(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getClubs()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (clubs) => {
          this.clubs = clubs;
          this.loadEvents();
        },
        error: () => {
          this.errorMessage = 'Could not load community data.';
        },
      });
  }

  loadEvents(): void {
    this.studentService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
      },
      error: () => {
        this.events = [];
      },
    });
  }
}
