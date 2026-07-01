import { Component } from '@angular/core';
import { ChatbotService } from '../chatbot.service';
import { finalize, timeout } from 'rxjs';

interface Message {
  text: string;
  isUser: boolean;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  suggestedQuestions = [
    'Explain AI in 3 simple sentences.',
    'What is machine learning?',
    'How can I revise better?',
  ];

  constructor(private chatbotService: ChatbotService) {
    this.messages.push({ text: 'Hello! How can I help you today?', isUser: false });
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

    this.chatbotService.sendMessage(userMessage).pipe(
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
}
