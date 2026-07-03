import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { UserRole } from '../users/schemas/user.schema';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import {
  Quiz,
  QuizAttempt,
  QuizAttemptDocument,
  QuizDocument,
} from './schemas/quiz.schema';

@Injectable()
export class QuizzesService {
  private pythonAiUrl: string;

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly recommendationsService: RecommendationsService,
  ) {
    let baseUrl = this.configService.get<string>('PYTHON_AI_URL') || 'http://localhost:8000/api';
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (!baseUrl.endsWith('/api')) {
      baseUrl = `${baseUrl}/api`;
    }
    this.pythonAiUrl = baseUrl;
  }

  async create(createQuizDto: CreateQuizDto): Promise<QuizDocument> {
    const createdQuiz = new this.quizModel({
      ...createQuizDto,
      courseId: new Types.ObjectId(createQuizDto.courseId),
      isPublished: createQuizDto.isPublished ?? true,
    });
    return createdQuiz.save();
  }

  async findAll(role: UserRole): Promise<any[]> {
    const query =
      role === UserRole.STUDENT ? { isPublished: true } : {};
    const quizzes = await this.quizModel
      .find(query)
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return quizzes.map((quiz) => this.serializeQuizForRole(quiz, role));
  }

  async findByCourse(courseId: string, role: UserRole): Promise<any[]> {
    const query: any = { courseId: new Types.ObjectId(courseId) };
    if (role === UserRole.STUDENT) {
      query.isPublished = true;
    }

    const quizzes = await this.quizModel
      .find(query)
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return quizzes.map((quiz) => this.serializeQuizForRole(quiz, role));
  }

  async findOne(id: string, role: UserRole): Promise<any> {
    const quiz = await this.quizModel.findById(id).populate('courseId').lean().exec();
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (role === UserRole.STUDENT && !quiz.isPublished) {
      throw new NotFoundException('Quiz not found');
    }

    return this.serializeQuizForRole(quiz, role);
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<QuizDocument> {
    const payload: any = { ...updateQuizDto };
    if (updateQuizDto.courseId) {
      payload.courseId = new Types.ObjectId(updateQuizDto.courseId);
    }

    const quiz = await this.quizModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    return quiz;
  }

  async remove(id: string): Promise<void> {
    const result = await this.quizModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Quiz not found');
    }

    await this.quizAttemptModel.deleteMany({ quizId: new Types.ObjectId(id) }).exec();
  }

  async submitAttempt(
    quizId: string,
    studentId: string,
    submitQuizAttemptDto: SubmitQuizAttemptDto,
  ): Promise<QuizAttemptDocument> {
    const quiz = await this.quizModel.findById(quizId).populate('courseId').exec();
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (!quiz.isPublished) {
      throw new BadRequestException('Quiz is not published');
    }

    if (submitQuizAttemptDto.answers.length !== quiz.questions.length) {
      throw new BadRequestException(
        'Answers count must match the number of quiz questions',
      );
    }

    let correctAnswers = 0;
    const incorrectAnswers: any[] = [];
    for (let index = 0; index < quiz.questions.length; index += 1) {
      const question = quiz.questions[index];
      if (submitQuizAttemptDto.answers[index] === question.correctOption) {
        correctAnswers += 1;
      } else {
        incorrectAnswers.push({
          questionIndex: index,
          question: question.prompt,
          selectedOption: submitQuizAttemptDto.answers[index],
          selectedAnswer: question.options[submitQuizAttemptDto.answers[index]] ?? 'No answer',
          correctOption: question.correctOption,
          correctAnswer: question.options[question.correctOption] ?? 'Correct answer unavailable',
          explanation: question.explanation,
        });
      }
    }

    const totalQuestions = quiz.questions.length;
    const scorePercent = Number(
      ((correctAnswers / totalQuestions) * 100).toFixed(2),
    );

    const course: any = quiz.courseId;
    const revision = await this.generateRevisionPlan({
      quizTitle: quiz.title,
      courseId: course?._id?.toString?.() ?? quiz.courseId.toString(),
      courseTitle: course?.title,
      wrongAnswers: incorrectAnswers,
    });

    const attempt = new this.quizAttemptModel({
      quizId: new Types.ObjectId(quizId),
      studentId: new Types.ObjectId(studentId),
      answers: submitQuizAttemptDto.answers,
      correctAnswers,
      totalQuestions,
      scorePercent,
      incorrectAnswers,
      weakTopics: revision.weakTopics,
      revisionPlan: revision.revisionPlan,
    });

    const savedAttempt = await attempt.save();
    await this.createWeaknessRecommendations(studentId, revision.revisionPlan);
    return savedAttempt;
  }

  async findMyAttempts(studentId: string): Promise<QuizAttemptDocument[]> {
    return this.quizAttemptModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate('quizId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAttemptsByQuiz(quizId: string): Promise<QuizAttemptDocument[]> {
    return this.quizAttemptModel
      .find({ quizId: new Types.ObjectId(quizId) })
      .populate('studentId', '-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  private serializeQuizForRole(quiz: any, role: UserRole): any {
    if (role !== UserRole.STUDENT) {
      return quiz;
    }

    return {
      ...quiz,
      questions: quiz.questions.map((question: any) => ({
        prompt: question.prompt,
        options: question.options,
        explanation: question.explanation,
      })),
    };
  }

  private async generateRevisionPlan(payload: {
    quizTitle: string;
    courseId?: string;
    courseTitle?: string;
    wrongAnswers: any[];
  }): Promise<{ weakTopics: string[]; revisionPlan: any[] }> {
    if (!payload.wrongAnswers.length) {
      return { weakTopics: [], revisionPlan: [] };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonAiUrl}/assessment/revision-plan`, payload),
      );
      return {
        weakTopics: response.data?.weakTopics || [],
        revisionPlan: response.data?.revisionPlan || [],
      };
    } catch (error) {
      return this.buildFallbackRevisionPlan(payload);
    }
  }

  private buildFallbackRevisionPlan(payload: {
    quizTitle: string;
    courseId?: string;
    courseTitle?: string;
    wrongAnswers: any[];
  }): { weakTopics: string[]; revisionPlan: any[] } {
    const revisionPlan = payload.wrongAnswers.slice(0, 5).map((answer, index) => {
      const weakConcept = this.extractWeakConcept(answer.question, index);
      return {
        weakConcept,
        reason: answer.explanation || `You selected "${answer.selectedAnswer}" instead of "${answer.correctAnswer}".`,
        recommendedAction: 'Review the related course PDF, then ask the chatbot for a short explanation and one practice question.',
        relatedCourse: payload.courseTitle || 'Selected course',
        relatedPdf: '',
        suggestedChatbotQuestion: `Can you explain ${weakConcept} using the ${payload.courseTitle || 'selected course'} PDF and give me one practice question?`,
        priority: index < 2 ? 'HIGH' : 'MEDIUM',
      };
    });

    return {
      revisionPlan,
      weakTopics: revisionPlan.map((item) => item.weakConcept),
    };
  }

  private extractWeakConcept(question: string, index: number): string {
    const words = (question || '')
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 4);
    return words.join(' ') || `Quiz concept ${index + 1}`;
  }

  private async createWeaknessRecommendations(studentId: string, revisionPlan: any[]): Promise<void> {
    try {
      for (const item of revisionPlan.slice(0, 3)) {
        await this.recommendationsService.createForStudent(studentId, {
          title: `Revise: ${item.weakConcept}`,
          description: `${item.reason} ${item.recommendedAction}`,
          type: 'QUIZ_WEAKNESS',
          priority: item.priority === 'HIGH' ? 3 : item.priority === 'MEDIUM' ? 2 : 1,
        });
      }
    } catch (error) {
      console.error('Failed to create weakness recommendations:', error);
    }
  }
}
