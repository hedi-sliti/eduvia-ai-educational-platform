import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import {
  AdminService,
  AdminUserItem,
  CreateAdminUserPayload,
  UserRole,
} from '../admin.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserItem[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  editingId: string | null = null;

  form: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
  } = {
    email: '',
    password: '',
    name: '',
    role: 'STUDENT',
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService
      .getUsers()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.users = items;
        },
        error: () => {
          this.errorMessage = 'Could not load users.';
        },
      });
  }

  editUser(user: AdminUserItem): void {
    this.editingId = user._id;
    this.form.email = user.email;
    this.form.password = '';
    this.form.name = user.name;
    this.form.role = user.role;
  }

  resetForm(): void {
    this.editingId = null;
    this.form.email = '';
    this.form.password = '';
    this.form.name = '';
    this.form.role = 'STUDENT';
  }

  saveUser(): void {
    if (!this.form.email.trim() || !this.form.name.trim()) {
      this.errorMessage = 'Email and name are required.';
      return;
    }

    if (!this.editingId && !this.form.password.trim()) {
      this.errorMessage = 'Password is required when creating a user.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    if (this.editingId) {
      const payload: any = {
        email: this.form.email,
        name: this.form.name,
        role: this.form.role,
      };

      if (this.form.password.trim()) {
        payload.password = this.form.password;
      }

      this.adminService
        .updateUser(this.editingId, payload)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe({
          next: () => {
            this.successMessage = 'User updated successfully.';
            this.resetForm();
            this.loadUsers();
          },
          error: () => {
            this.errorMessage = 'Failed to update user.';
          },
        });

      return;
    }

    const createPayload: CreateAdminUserPayload = {
      email: this.form.email,
      password: this.form.password,
      name: this.form.name,
      role: this.form.role,
    };

    this.adminService
      .createUser(createPayload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'User created successfully.';
          this.resetForm();
          this.loadUsers();
        },
        error: () => {
          this.errorMessage = 'Failed to create user.';
        },
      });
  }

  deleteUser(userId: string): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.successMessage = 'User deleted successfully.';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Failed to delete user.';
      },
    });
  }
}
