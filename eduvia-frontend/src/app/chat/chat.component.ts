import { Component, OnInit } from '@angular/core';
import { ChatbotService } from '../chatbot.service';
import { finalize, timeout } from 'rxjs';
import { CourseItem, TeacherService } from '../teacher.service';

interface Message {
  text: string;
  isUser: boolean;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isLoadingCourses = false;
  courses: CourseItem[] = [];
  selectedCourseId = '';
  suggestedQuestions = [
    'Explain AI in 3 simple sentences.',
    'What is machine learning?',
    'How can I revise better?',
  ];

  constructor(
    private chatbotService: ChatbotService,
    private teacherService: TeacherService,
  ) {
    this.messages.push({ text: 'Hello! How can I help you today?', isUser: false });
  }

  ngOnInit(): void {
    this.loadCourses();
  }

  get selectedCourseTitle(): string {
    const selected = this.courses.find((course) => course._id === this.selectedCourseId);
    return selected?.title || '';
  }

  askSuggestedQuestion(question: string): void {
    this.userInput = question;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    this.messages.push({ text: this.userInput, isUser: true });
    const userMessage = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    this.chatbotService.sendMessage(
      userMessage,
      this.selectedCourseId || undefined,
      this.selectedCourseTitle || undefined,
    ).pipe(
      timeout(60000),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (response: any) => {
        const answer = response?.response || response?.answer || response?.message || 'No response received';
        this.messages.push({ text: answer, isUser: false });
      },
      error: (error) => {
        console.error('Chat request failed:', error);
        this.messages.push({ text: 'Sorry, the chatbot service is unavailable. Please try again.', isUser: false });
      }
    });
  }

  private loadCourses(): void {
    this.isLoadingCourses = true;
    this.teacherService
      .getCourses()
      .pipe(finalize(() => (this.isLoadingCourses = false)))
      .subscribe({
        next: (courses) => {
          this.courses = courses || [];
        },
        error: (error) => {
          console.error('Could not load courses for chat selector:', error);
        },
      });
  }
}
