import { Component } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentUser$;

  constructor(public authService: AuthService) {
    this.currentUser$ = this.authService.currentUser;
  }

  logout(): void {
    this.authService.logout();
  }
}
