import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';

export enum ReminderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateReminderDto {
  @IsMongoId()
  studentId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
