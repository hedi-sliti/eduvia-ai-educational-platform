import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from '../assessments/schemas/assessment.schema';
import { QuizAttempt, QuizAttemptDocument } from '../quizzes/schemas/quiz.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Progress, ProgressDocument, ProgressRiskLevel } from './schemas/progress.schema';

export interface ProgressSummary {
  studentId: string;
  assessmentCount: number;
  averageAssessmentScore: number | null;
  quizAttemptsCount: number;
  averageQuizScore: number | null;
  overallScore: number | null;
  riskLevel: ProgressRiskLevel;
  needsAttention: boolean;
  latestAssessmentAt: Date | null;
  latestQuizAttemptAt: Date | null;
  recommendations: string[];
  lastComputedAt: Date;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getMyProgress(studentId: string): Promise<ProgressSummary> {
    return this.computeAndPersistStudentProgress(studentId);
  }

  async getStudentProgress(studentId: string): Promise<ProgressSummary> {
    return this.computeAndPersistStudentProgress(studentId);
  }

  async listAtRiskStudents(threshold = 60): Promise<any[]> {
    if (threshold < 0 || threshold > 100) {
      throw new BadRequestException('threshold must be between 0 and 100');
    }

    const students = await this.userModel
      .find({ role: UserRole.STUDENT })
      .select('_id name email role')
      .lean()
      .exec();

    const computed = await Promise.all(
      students.map(async (student) => {
        const progress = await this.computeAndPersistStudentProgress(
          student._id.toString(),
          threshold,
        );
        return {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            role: student.role,
          },
          progress,
        };
      }),
    );

    return computed.filter(
      (item) =>
        item.progress.riskLevel === ProgressRiskLevel.AT_RISK ||
        item.progress.riskLevel === ProgressRiskLevel.NO_DATA,
    );
  }

  private async computeAndPersistStudentProgress(
    studentId: string,
    threshold = 60,
  ): Promise<ProgressSummary> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }

    const student = await this.userModel
      .findById(studentId)
      .select('_id name email role')
      .lean()
      .exec();
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    const studentObjectId = new Types.ObjectId(studentId);
    const [assessments, quizAttempts] = await Promise.all([
      this.assessmentModel
        .find({ studentId: studentObjectId })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.quizAttemptModel
        .find({ studentId: studentObjectId })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const assessmentScores = assessments
      .map((assessment) => assessment.score)
      .filter((score): score is number => typeof score === 'number');
    const quizScores = quizAttempts
      .map((attempt) => attempt.scorePercent)
      .filter((score): score is number => typeof score === 'number');

    const averageAssessmentScore = this.averageOrNull(assessmentScores);
    const averageQuizScore = this.averageOrNull(quizScores);

    const overallScore = this.averageOrNull(
      [averageAssessmentScore, averageQuizScore].filter(
        (score): score is number => score !== null,
      ),
    );

    const riskLevel = this.computeRiskLevel(overallScore, threshold);
    const needsAttention =
      riskLevel === ProgressRiskLevel.AT_RISK ||
      riskLevel === ProgressRiskLevel.NO_DATA;
    const recommendations = this.buildRecommendations(
      riskLevel,
      assessments.length,
      quizAttempts.length,
      overallScore,
      threshold,
    );

    const latestAssessmentAt = ((assessments[0] as any)?.createdAt as Date | undefined) ?? null;
    const latestQuizAttemptAt = ((quizAttempts[0] as any)?.createdAt as Date | undefined) ?? null;
    const lastComputedAt = new Date();

    await this.progressModel
      .findOneAndUpdate(
        { studentId: studentObjectId },
        {
          studentId: studentObjectId,
          assessmentCount: assessments.length,
          averageAssessmentScore: averageAssessmentScore ?? undefined,
          quizAttemptsCount: quizAttempts.length,
          averageQuizScore: averageQuizScore ?? undefined,
          overallScore: overallScore ?? undefined,
          riskLevel,
          needsAttention,
          latestAssessmentAt: latestAssessmentAt ?? undefined,
          latestQuizAttemptAt: latestQuizAttemptAt ?? undefined,
          recommendations,
          lastComputedAt,
        },
        { upsert: true, new: true },
      )
      .exec();

    return {
      studentId,
      assessmentCount: assessments.length,
      averageAssessmentScore,
      quizAttemptsCount: quizAttempts.length,
      averageQuizScore,
      overallScore,
      riskLevel,
      needsAttention,
      latestAssessmentAt,
      latestQuizAttemptAt,
      recommendations,
      lastComputedAt,
    };
  }

  private averageOrNull(values: number[]): number | null {
    if (!values.length) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return Number((total / values.length).toFixed(2));
  }

  private computeRiskLevel(
    overallScore: number | null,
    threshold: number,
  ): ProgressRiskLevel {
    if (overallScore === null) {
      return ProgressRiskLevel.NO_DATA;
    }

    if (overallScore < threshold) {
      return ProgressRiskLevel.AT_RISK;
    }

    if (overallScore < threshold + 15) {
      return ProgressRiskLevel.MODERATE;
    }

    return ProgressRiskLevel.GOOD;
  }

  private buildRecommendations(
    riskLevel: ProgressRiskLevel,
    assessmentCount: number,
    quizAttemptsCount: number,
    overallScore: number | null,
    threshold: number,
  ): string[] {
    const recommendations: string[] = [];

    if (assessmentCount === 0) {
      recommendations.push('Complete an initial assessment to establish your baseline.');
    }

    if (quizAttemptsCount === 0) {
      recommendations.push('Attempt at least one course quiz to track practical progress.');
    }

    if (riskLevel === ProgressRiskLevel.AT_RISK) {
      recommendations.push('Prioritize weak topics and request teacher support this week.');
      recommendations.push('Use short daily chatbot revision sessions and retake a quiz.');
    } else if (riskLevel === ProgressRiskLevel.MODERATE) {
      recommendations.push('Maintain practice cadence and target one improvement area.');
    } else if (riskLevel === ProgressRiskLevel.GOOD) {
      recommendations.push('Keep momentum with advanced exercises and spaced revision.');
    }

    if (overallScore !== null && overallScore < threshold) {
      recommendations.push('Your current overall score is below target; schedule a review session.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Progress is stable. Continue with your current study plan.');
    }

    return recommendations;
  }
}
