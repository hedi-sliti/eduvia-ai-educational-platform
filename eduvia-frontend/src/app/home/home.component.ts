import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  title = 'Welcome to Eduvia';
  subtitle = 'Your AI-powered educational platform';

  stats = [
    { value: '3', label: 'roles supported' },
    { value: '1', label: 'local AI pipeline' },
    { value: '100%', label: 'presentation-ready flow' },
  ];
}
