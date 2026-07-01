import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { StudentProgress, StudentService } from '../student.service';

@Component({
  selector: 'app-student-progress',
  templateUrl: './student-progress.component.html',
  styleUrls: ['./student-progress.component.css'],
})
export class StudentProgressComponent implements OnInit {
  progress: StudentProgress | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService
      .getMyProgress()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.progress = data;
        },
        error: () => {
          this.errorMessage = 'Could not load progress data. Please try again.';
        },
      });
  }
}
