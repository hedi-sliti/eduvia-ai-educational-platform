import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../users/schemas/user.schema';
import { ReminderPriority } from '../dto/create-reminder.dto';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ enum: UserRole, required: true })
  creatorRole: UserRole;

  @Prop()
  title?: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ReminderPriority, default: ReminderPriority.MEDIUM })
  priority: ReminderPriority;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
