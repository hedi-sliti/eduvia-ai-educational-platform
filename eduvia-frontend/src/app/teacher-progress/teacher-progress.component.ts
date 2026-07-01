import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AtRiskStudentItem, TeacherService } from '../teacher.service';

@Component({
  selector: 'app-teacher-progress',
  templateUrl: './teacher-progress.component.html',
  styleUrls: ['./teacher-progress.component.css'],
})
export class TeacherProgressComponent implements OnInit {
  atRiskStudents: AtRiskStudentItem[] = [];
  selectedProgress: any = null;
  selectedStudentLabel = '';
  isLoading = false;
  errorMessage = '';

  constructor(private teacherService: TeacherService) {}

  ngOnInit(): void {
    this.loadAtRisk();
  }

  loadAtRisk(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherService
      .getAtRiskStudents()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.atRiskStudents = items;
        },
        error: () => {
          this.errorMessage = 'Could not load at-risk students.';
        },
      });
  }

  viewStudentProgress(student: AtRiskStudentItem): void {
    this.selectedStudentLabel = `${student.student.name} (${student.student.email})`;
    this.teacherService.getStudentProgress(student.student._id).subscribe({
      next: (data) => {
        this.selectedProgress = data;
      },
      error: () => {
        this.selectedProgress = null;
        this.errorMessage = 'Could not load selected student progress.';
      },
    });
  }
}
