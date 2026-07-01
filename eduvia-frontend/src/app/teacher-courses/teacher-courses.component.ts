import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { CourseItem, TeacherService } from '../teacher.service';

@Component({
  selector: 'app-teacher-courses',
  templateUrl: './teacher-courses.component.html',
  styleUrls: ['./teacher-courses.component.css'],
})
export class TeacherCoursesComponent implements OnInit {
  courses: CourseItem[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form: Partial<CourseItem> = {
    title: '',
    description: '',
    subject: '',
    level: '',
    contentUrl: '',
  };

  editingId: string | null = null;

  constructor(private teacherService: TeacherService) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teacherService
      .getCourses()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.courses = items;
        },
        error: () => {
          this.errorMessage = 'Could not load courses.';
        },
      });
  }

  editCourse(course: CourseItem): void {
    this.editingId = course._id;
    this.form = {
      title: course.title,
      description: course.description || '',
      subject: course.subject || '',
      level: course.level || '',
      contentUrl: course.contentUrl || '',
    };
  }

  resetForm(): void {
    this.editingId = null;
    this.form = {
      title: '',
      description: '',
      subject: '',
      level: '',
      contentUrl: '',
    };
  }

  saveCourse(): void {
    if (!this.form.title?.trim()) {
      this.errorMessage = 'Course title is required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      title: this.form.title,
      description: this.form.description,
      subject: this.form.subject,
      level: this.form.level,
      contentUrl: this.form.contentUrl,
    };

    const request$ = this.editingId
      ? this.teacherService.updateCourse(this.editingId, payload)
      : this.teacherService.createCourse(payload);

    request$.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: () => {
        this.successMessage = this.editingId
          ? 'Course updated successfully.'
          : 'Course created successfully.';
        this.resetForm();
        this.loadCourses();
      },
      error: () => {
        this.errorMessage = this.editingId
          ? 'Failed to update course.'
          : 'Failed to create course.';
      },
    });
  }

  deleteCourse(id: string): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.teacherService.deleteCourse(id).subscribe({
      next: () => {
        this.successMessage = 'Course deleted successfully.';
        this.loadCourses();
      },
      error: () => {
        this.errorMessage = 'Failed to delete course.';
      },
    });
  }
}
