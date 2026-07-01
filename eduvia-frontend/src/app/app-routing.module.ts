import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ChatComponent } from './chat/chat.component';
import { KnowledgeComponent } from './knowledge/knowledge.component';
import { LoginComponent } from './login/login.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { StudentProgressComponent } from './student-progress/student-progress.component';
import { StudentQuizzesComponent } from './student-quizzes/student-quizzes.component';
import { StudentQuizAttemptComponent } from './student-quiz-attempt/student-quiz-attempt.component';
import { StudentSupportComponent } from './student-support/student-support.component';
import { StudentCommunityComponent } from './student-community/student-community.component';
import { StudentRecommendationsComponent } from './student-recommendations/student-recommendations.component';
import { TeacherCoursesComponent } from './teacher-courses/teacher-courses.component';
import { TeacherQuizzesComponent } from './teacher-quizzes/teacher-quizzes.component';
import { TeacherProgressComponent } from './teacher-progress/teacher-progress.component';
import { TeacherSupportComponent } from './teacher-support/teacher-support.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminAnalyticsComponent } from './admin-analytics/admin-analytics.component';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'chat',
    component: ChatComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'teacher/knowledge',
    component: KnowledgeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER', 'ADMIN'] }
  },
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/progress',
    component: StudentProgressComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/quizzes',
    component: StudentQuizzesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/quizzes/:id/attempt',
    component: StudentQuizAttemptComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/support',
    component: StudentSupportComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/community',
    component: StudentCommunityComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'student/recommendations',
    component: StudentRecommendationsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'teacher-dashboard',
    component: TeacherDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER'] }
  },
  {
    path: 'teacher/courses',
    component: TeacherCoursesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER'] }
  },
  {
    path: 'teacher/quizzes',
    component: TeacherQuizzesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER'] }
  },
  {
    path: 'teacher/progress',
    component: TeacherProgressComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER'] }
  },
  {
    path: 'teacher/support',
    component: TeacherSupportComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER'] }
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/analytics',
    component: AdminAnalyticsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
