import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JwtModule } from '@auth0/angular-jwt';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ChatComponent } from './chat/chat.component';
import { KnowledgeComponent } from './knowledge/knowledge.component';
import { LoginComponent } from './login/login.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { StudentProgressComponent } from './student-progress/student-progress.component';
import { StudentQuizzesComponent } from './student-quizzes/student-quizzes.component';
import { StudentQuizAttemptComponent } from './student-quiz-attempt/student-quiz-attempt.component';
import { StudentSupportComponent } from './student-support/student-support.component';
import { StudentCommunityComponent } from './student-community/student-community.component';
import { StudentRecommendationsComponent } from './student-recommendations/student-recommendations.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { TeacherCoursesComponent } from './teacher-courses/teacher-courses.component';
import { TeacherQuizzesComponent } from './teacher-quizzes/teacher-quizzes.component';
import { TeacherProgressComponent } from './teacher-progress/teacher-progress.component';
import { TeacherSupportComponent } from './teacher-support/teacher-support.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminAnalyticsComponent } from './admin-analytics/admin-analytics.component';
import { JwtInterceptor } from './jwt.interceptor';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ChatComponent,
    KnowledgeComponent,
    LoginComponent,
    StudentDashboardComponent,
    StudentProgressComponent,
    StudentQuizzesComponent,
    StudentQuizAttemptComponent,
    StudentSupportComponent,
    StudentCommunityComponent,
    StudentRecommendationsComponent,
    TeacherDashboardComponent,
    TeacherCoursesComponent,
    TeacherQuizzesComponent,
    TeacherProgressComponent,
    TeacherSupportComponent,
    AdminDashboardComponent,
    AdminUsersComponent,
    AdminAnalyticsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['localhost:3001'],
        disallowedRoutes: []
      }
    })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
