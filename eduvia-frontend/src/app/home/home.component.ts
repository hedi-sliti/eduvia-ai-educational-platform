import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  title = 'Welcome to Eduvia';
  subtitle = 'Your AI-powered educational platform';

  highlights = [
    {
      title: 'Students get instant help',
      text: 'Ask questions, review uploaded material, and keep momentum inside a focused learning space.',
    },
    {
      title: 'Teachers keep control',
      text: 'Manage knowledge, support learners, and stay organized without leaving the platform.',
    },
    {
      title: 'Admins keep the system clean',
      text: 'Oversee access, content, and analytics through a lightweight operational dashboard.',
    },
  ];

  flow = [
    'Sign in with your role',
    'Open the workspace you need',
    'Use chat, uploads, or dashboards',
  ];
}
