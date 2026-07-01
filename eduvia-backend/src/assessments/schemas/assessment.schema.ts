import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssessmentDocument = Assessment & Document;

@Schema({ timestamps: true })
export class Assessment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  answers: Record<string, any>;

  @Prop()
  score: number;

  @Prop()
  feedback: string;

  @Prop({ default: false })
  completed: boolean;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);
