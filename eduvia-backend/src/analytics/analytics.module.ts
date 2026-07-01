import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from '../assessments/schemas/assessment.schema';
import { Club, ClubSchema } from '../clubs-events/schemas/club.schema';
import { Event, EventSchema } from '../clubs-events/schemas/event.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { Progress, ProgressSchema } from '../progress/schemas/progress.schema';
import { Recommendation, RecommendationSchema } from '../recommendations/schemas/recommendation.schema';
import { Reminder, ReminderSchema } from '../reminders-support/schemas/reminder.schema';
import { SupportMessage, SupportMessageSchema } from '../reminders-support/schemas/support-message.schema';
import { Quiz, QuizAttempt, QuizAttemptSchema, QuizSchema } from '../quizzes/schemas/quiz.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Recommendation.name, schema: RecommendationSchema },
      { name: Club.name, schema: ClubSchema },
      { name: Event.name, schema: EventSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: SupportMessage.name, schema: SupportMessageSchema },
      { name: Progress.name, schema: ProgressSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
