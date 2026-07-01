import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
  ) {}

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
    const quiz = await this.quizModel.findById(quizId).exec();
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
    for (let index = 0; index < quiz.questions.length; index += 1) {
      const question = quiz.questions[index];
      if (submitQuizAttemptDto.answers[index] === question.correctOption) {
        correctAnswers += 1;
      }
    }

    const totalQuestions = quiz.questions.length;
    const scorePercent = Number(
      ((correctAnswers / totalQuestions) * 100).toFixed(2),
    );

    const attempt = new this.quizAttemptModel({
      quizId: new Types.ObjectId(quizId),
      studentId: new Types.ObjectId(studentId),
      answers: submitQuizAttemptDto.answers,
      correctAnswers,
      totalQuestions,
      scorePercent,
    });

    return attempt.save();
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
}
