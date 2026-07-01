import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class QuizQuestion {
  @Prop({ required: true })
  prompt: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true, min: 0 })
  correctOption: number;

  @Prop()
  explanation?: string;
}

@Schema({ timestamps: true })
export class Quiz {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop()
  level?: string;

  @Prop()
  subject?: string;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ min: 1 })
  timeLimitMinutes?: number;

  @Prop({ type: [QuizQuestion], required: true })
  questions: QuizQuestion[];
}

@Schema({ timestamps: true })
export class QuizAttempt {
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quizId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  answers: number[];

  @Prop({ required: true, min: 0 })
  correctAnswers: number;

  @Prop({ required: true, min: 0 })
  totalQuestions: number;

  @Prop({ required: true, min: 0, max: 100 })
  scorePercent: number;
}

export type QuizDocument = Quiz & Document;
export type QuizAttemptDocument = QuizAttempt & Document;

export const QuizSchema = SchemaFactory.createForClass(Quiz);
export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);
