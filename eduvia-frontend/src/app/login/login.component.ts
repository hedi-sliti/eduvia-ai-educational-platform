import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: () => {
        const user = this.authService.currentUserValue;
        if (user) {
          switch (user.role) {
            case 'ADMIN':
              this.router.navigate(['/admin-dashboard']);
              break;
            case 'TEACHER':
              this.router.navigate(['/teacher-dashboard']);
              break;
            case 'STUDENT':
              this.router.navigate(['/student-dashboard']);
              break;
          }
        }
      },
      error: () => {
        this.errorMessage = 'Invalid email or password. Please use one of the test accounts.';
      },
    });
  }
}
