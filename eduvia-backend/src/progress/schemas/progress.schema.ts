import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ProgressRiskLevel {
  NO_DATA = 'NO_DATA',
  AT_RISK = 'AT_RISK',
  MODERATE = 'MODERATE',
  GOOD = 'GOOD',
}

export type ProgressDocument = Progress & Document;

@Schema({ timestamps: true })
export class Progress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  studentId: Types.ObjectId;

  @Prop({ default: 0 })
  assessmentCount: number;

  @Prop()
  averageAssessmentScore?: number;

  @Prop({ default: 0 })
  quizAttemptsCount: number;

  @Prop()
  averageQuizScore?: number;

  @Prop()
  overallScore?: number;

  @Prop({ enum: ProgressRiskLevel, default: ProgressRiskLevel.NO_DATA })
  riskLevel: ProgressRiskLevel;

  @Prop({ default: true })
  needsAttention: boolean;

  @Prop({ type: Date })
  latestAssessmentAt?: Date;

  @Prop({ type: Date })
  latestQuizAttemptAt?: Date;

  @Prop({ type: [String], default: [] })
  recommendations: string[];

  @Prop({ type: [Object], default: [] })
  weakTopics?: any[];

  @Prop({ type: Date, default: Date.now })
  lastComputedAt: Date;
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);
