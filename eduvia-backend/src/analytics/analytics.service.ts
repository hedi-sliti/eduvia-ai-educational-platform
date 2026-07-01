import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Assessment, AssessmentDocument } from '../assessments/schemas/assessment.schema';
import { Club, ClubDocument } from '../clubs-events/schemas/club.schema';
import { Event, EventDocument } from '../clubs-events/schemas/event.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { Progress, ProgressDocument } from '../progress/schemas/progress.schema';
import { Recommendation, RecommendationDocument } from '../recommendations/schemas/recommendation.schema';
import { Reminder, ReminderDocument } from '../reminders-support/schemas/reminder.schema';
import { SupportMessage, SupportMessageDocument } from '../reminders-support/schemas/support-message.schema';
import { Quiz, QuizAttempt, QuizAttemptDocument, QuizDocument } from '../quizzes/schemas/quiz.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Recommendation.name)
    private recommendationModel: Model<RecommendationDocument>,
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(SupportMessage.name)
    private supportMessageModel: Model<SupportMessageDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
  ) {}

  async getOverview() {
    const [counts, averages] = await Promise.all([
      this.getCounts(),
      this.getAverages(),
    ]);

    return {
      generatedAt: new Date(),
      counts,
      averages,
    };
  }

  async getUsersAnalytics() {
    const [totalUsers, students, teachers, admins] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: UserRole.STUDENT }),
      this.userModel.countDocuments({ role: UserRole.TEACHER }),
      this.userModel.countDocuments({ role: UserRole.ADMIN }),
    ]);

    return {
      generatedAt: new Date(),
      users: {
        total: totalUsers,
        students,
        teachers,
        admins,
      },
    };
  }

  async getLearningAnalytics() {
    const [
      courses,
      quizzes,
      assessments,
      quizAttempts,
      recommendations,
      averages,
    ] = await Promise.all([
      this.courseModel.countDocuments(),
      this.quizModel.countDocuments(),
      this.assessmentModel.countDocuments(),
      this.quizAttemptModel.countDocuments(),
      this.recommendationModel.countDocuments(),
      this.getAverages(),
    ]);

    return {
      generatedAt: new Date(),
      learning: {
        courses,
        quizzes,
        assessments,
        quizAttempts,
        recommendations,
      },
      averages,
    };
  }

  async getEngagementAnalytics() {
    const [clubs, events, reminders, supportMessages, progressRecords] =
      await Promise.all([
        this.clubModel.countDocuments(),
        this.eventModel.countDocuments(),
        this.reminderModel.countDocuments(),
        this.supportMessageModel.countDocuments(),
        this.progressModel.countDocuments(),
      ]);

    return {
      generatedAt: new Date(),
      engagement: {
        clubs,
        events,
        reminders,
        supportMessages,
        progressRecords,
      },
    };
  }

  private async getCounts() {
    const [
      users,
      students,
      teachers,
      courses,
      quizzes,
      assessments,
      quizAttempts,
      recommendations,
      clubs,
      events,
      reminders,
      supportMessages,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: UserRole.STUDENT }),
      this.userModel.countDocuments({ role: UserRole.TEACHER }),
      this.courseModel.countDocuments(),
      this.quizModel.countDocuments(),
      this.assessmentModel.countDocuments(),
      this.quizAttemptModel.countDocuments(),
      this.recommendationModel.countDocuments(),
      this.clubModel.countDocuments(),
      this.eventModel.countDocuments(),
      this.reminderModel.countDocuments(),
      this.supportMessageModel.countDocuments(),
    ]);

    return {
      users,
      students,
      teachers,
      courses,
      quizzes,
      assessments,
      quizAttempts,
      recommendations,
      clubs,
      events,
      reminders,
      supportMessages,
    };
  }

  private async getAverages() {
    const [assessmentAvg, quizAvg, progressAvg] = await Promise.all([
      this.averageField(this.assessmentModel, 'score'),
      this.averageField(this.quizAttemptModel, 'scorePercent'),
      this.averageField(this.progressModel, 'overallScore'),
    ]);

    return {
      assessmentScore: assessmentAvg,
      quizScore: quizAvg,
      overallProgress: progressAvg,
    };
  }

  private async averageField(model: Model<any>, field: string): Promise<number | null> {
    const result = await model
      .aggregate([
        {
          $match: {
            [field]: { $type: 'number' },
          },
        },
        {
          $group: {
            _id: null,
            avg: { $avg: `$${field}` },
          },
        },
      ])
      .exec();

    if (!result.length || typeof result[0].avg !== 'number') {
      return null;
    }

    return Number(result[0].avg.toFixed(2));
  }
}
