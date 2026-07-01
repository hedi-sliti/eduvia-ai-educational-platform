import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from '../assessments/schemas/assessment.schema';
import { QuizAttempt, QuizAttemptSchema } from '../quizzes/schemas/quiz.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { Progress, ProgressSchema } from './schemas/progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Progress.name, schema: ProgressSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
